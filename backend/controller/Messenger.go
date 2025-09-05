package controller

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"example.com/GROUB/config"
	"example.com/GROUB/entity"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

/* ===================== Utilities ===================== */

func parseUintParam(c *gin.Context, name string) (uint, error) {
	v := c.Param(name)
	id64, err := strconv.ParseUint(v, 10, 64)
	return uint(id64), err
}
func parseUintQuery(c *gin.Context, name string) (uint, error) {
	v := c.Query(name)
	if v == "" {
		return 0, errors.New("missing query param: " + name)
	}
	id64, err := strconv.ParseUint(v, 10, 64)
	return uint(id64), err
}

/* ===================== Open Thread / Add Friend ===================== */

type OpenThreadReq struct {
	CurrentUserID  uint   `json:"currentUserId"`
	FriendUsername string `json:"friendUsername"` // รับได้ทั้ง username หรือเลข ID
}

// POST /api/dm/threads/open
// หา/สร้างห้อง DM โดยใช้ username หรือ id ของเพื่อน (กันซ้ำห้องด้วย canonical order)
func OpenThread(c *gin.Context) {
	var req OpenThreadReq
	if err := c.ShouldBindJSON(&req); err != nil || req.CurrentUserID == 0 || strings.TrimSpace(req.FriendUsername) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	db := config.DB()

	// current user
	var me entity.Member
	if err := db.First(&me, req.CurrentUserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "current user not found"})
		return
	}

	// sanitize ค่าที่พิมพ์มา: ตัดช่องว่าง + quote
	raw := strings.TrimSpace(req.FriendUsername)
	raw = strings.Trim(raw, `"'`)

	// หาเพื่อน: ถ้าเป็นตัวเลขล้วน -> หาโดย ID ก่อน, ไม่งั้นหาโดย user_name
	var friend entity.Member
	if _, err := strconv.Atoi(raw); err == nil {
		// เป็นเลข → หา id ก่อน
		if e := db.First(&friend, raw).Error; e != nil {
			// เผื่อไม่เจอด้วย id ลอง user_name เท่ากัน
			if e2 := db.Where("user_name = ?", raw).First(&friend).Error; e2 != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "friend username not found"})
				return
			}
		}
	} else {
		// ไม่ใช่เลข → หาโดย user_name
		if err := db.Where("user_name = ?", raw).First(&friend).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "friend username not found"})
			return
		}
	}

	if friend.ID == me.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot open thread with yourself"})
		return
	}

	// canonical pair
	a, b := me.ID, friend.ID
	if a > b {
		a, b = b, a
	}

	// find or create thread
	var th entity.DMThread
	err := db.Preload("User1").Preload("User2").
		Where("user1_id = ? AND user2_id = ?", a, b).
		First(&th).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		th = entity.DMThread{User1ID: a, User2ID: b, LastMessageAt: time.Now()}
		if err := db.Create(&th).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "create thread failed"})
			return
		}
		_ = db.Preload("User1").Preload("User2").First(&th, th.ID)

		// สร้าง FriendLink (กันซ้ำโดย hook + unique index)
		_ = db.Create(&entity.FriendLink{AID: a, BID: b}).Error
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query thread failed", "detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": th})
}

/* ===================== Threads CRUD ===================== */

// GET /api/dm/threads?memberId=1
func ListThreads(c *gin.Context) {
	memberID, err := parseUintQuery(c, "memberId")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := config.DB()
	var threads []entity.DMThread

	// fallback กันคอลัมน์ยังไม่ถูก migrate
	order := "updated_at DESC"
	if db.Migrator().HasColumn(&entity.DMThread{}, "last_message_at") ||
		db.Migrator().HasColumn(&entity.DMThread{}, "LastMessageAt") {
		order = "COALESCE(last_message_at, updated_at) DESC"
	}

	if err := db.
		Preload("User1").
		Preload("User2").
		Where("user1_id = ? OR user2_id = ?", memberID, memberID).
		Order(order).
		Find(&threads).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "query threads failed",
			"detail": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": threads})
}

// DELETE /api/dm/threads/:id
func DeleteThread(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := config.DB().Delete(&entity.DMThread{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

/* ===================== Posts (Messages) ===================== */

// GET /api/dm/threads/:id/posts?offset=0&limit=50
func ListPosts(c *gin.Context) {
	threadID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid thread id"})
		return
	}
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	var posts []entity.DMPost
	if err := config.DB().
		Preload("Sender").
		Preload("Files").
		Where("thread_id = ?", threadID).
		Order("created_at ASC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query posts failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": posts})
}

type CreatePostReq struct {
	SenderID    uint   `json:"senderId"`
	Content     string `json:"content"`
	Attachments []struct {
		FileURL  string `json:"fileUrl"`
		FileType string `json:"fileType"`
	} `json:"attachments"`
}

// POST /api/dm/threads/:id/posts
func CreatePost(c *gin.Context) {
	threadID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid thread id"})
		return
	}
	var req CreatePostReq
	if err := c.ShouldBindJSON(&req); err != nil || req.SenderID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	db := config.DB()

	// ตรวจว่า sender เป็นสมาชิกของห้อง
	var th entity.DMThread
	if err := db.First(&th, threadID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "thread not found"})
		return
	}
	if !(req.SenderID == th.User1ID || req.SenderID == th.User2ID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "sender not in thread"})
		return
	}

	post := entity.DMPost{
		ThreadID: threadID,
		SenderID: req.SenderID,
		Content:  req.Content,
		IsRead:   false,
	}
	if err := db.Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create post failed"})
		return
	}

	// แนบไฟล์
	for _, a := range req.Attachments {
		f := entity.DMFile{
			PostID:   post.ID,
			FileURL:  a.FileURL,
			FileType: a.FileType,
		}
		_ = db.Create(&f).Error
	}

	// อัปเดต last message time
	_ = db.Model(&entity.DMThread{}).Where("id = ?", threadID).
		Update("last_message_at", time.Now()).Error

	// preload ตอบกลับสวยๆ
	_ = db.Preload("Sender").Preload("Files").First(&post, post.ID)

	c.JSON(http.StatusOK, gin.H{"data": post})
}

type EditPostReq struct {
	Content string `json:"content"`
}

// PATCH /api/dm/posts/:id
func EditPost(c *gin.Context) {
	postID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
		return
	}
	var req EditPostReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	now := time.Now()
	if err := config.DB().Model(&entity.DMPost{}).Where("id = ?", postID).
		Updates(map[string]any{"content": req.Content, "edited_at": &now}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "edit failed"})
		return
	}
	var post entity.DMPost
	_ = config.DB().Preload("Sender").Preload("Files").First(&post, postID).Error
	c.JSON(http.StatusOK, gin.H{"data": post})
}

// DELETE /api/dm/posts/:id
func DeletePost(c *gin.Context) {
	postID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
		return
	}
	if err := config.DB().Delete(&entity.DMPost{}, postID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

/* ===================== Read Receipt ===================== */

// PATCH /api/dm/threads/:id/read
// body: { "memberId": 123 }
type MarkReadReq struct {
	MemberID uint `json:"memberId"`
}

func MarkRead(c *gin.Context) {
	threadID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid thread id"})
		return
	}
	var req MarkReadReq
	if err := c.ShouldBindJSON(&req); err != nil || req.MemberID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	db := config.DB()
	// ทำให้ข้อความทั้งหมดที่ "ไม่ใช่ของเรา" กลายเป็นอ่านแล้ว
	if err := db.Model(&entity.DMPost{}).
		Where("thread_id = ? AND sender_id <> ? AND is_read = ?", threadID, req.MemberID, false).
		Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "mark read failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

/* ===================== Upload (save to ./uploads) ===================== */

// POST /api/dm/upload (multipart/form-data, field: file)
func UploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file"})
		return
	}
	_ = os.MkdirAll("./uploads", 0755)

	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(file.Filename))
	dst := filepath.Join("./uploads", filename)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "save failed"})
		return
	}

	// เสิร์ฟผ่าน Static: /uploads/<filename>
	url := "/uploads/" + filename
	c.JSON(http.StatusOK, gin.H{"url": url})
}

/* ===================== Search users (optional) ===================== */

// GET /api/dm/users/search?q=al   -> คืน top 10
func SearchUsers(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "q required"})
		return
	}
	var users []entity.Member
	if err := config.DB().Where("user_name LIKE ?", q+"%").Limit(10).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": users})
}
