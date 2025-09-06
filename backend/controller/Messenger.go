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
	"encoding/base64"
    "encoding/json"

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

// ดึง userID จาก middleware (c.Set("userID", ...)) หรือโหมด dev ผ่าน Authorization: Bearer uid:<id>
// เพิ่ม import:
// "encoding/base64"
// "encoding/json"

func authedUserID(c *gin.Context) (uint, bool) {
	// 1) middleware ตั้งไว้
	if v, ok := c.Get("userID"); ok {
		switch t := v.(type) {
		case uint:
			if t > 0 { return t, true }
		case int64:
			if t > 0 { return uint(t), true }
		case float64:
			if t > 0 { return uint(t), true }
		}
	}

	// 2) dev header ตรง ๆ
	if x := strings.TrimSpace(c.GetHeader("X-User-Id")); x != "" {
		if n, err := strconv.ParseUint(x, 10, 64); err == nil && n > 0 {
			return uint(n), true
		}
	}

	// 3) Authorization
	auth := strings.TrimSpace(c.GetHeader("Authorization"))
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		token := strings.TrimSpace(auth[7:])

		// 3.1) รูปแบบ dev: Bearer uid:<id>
		if strings.HasPrefix(token, "uid:") {
			if n, err := strconv.ParseUint(strings.TrimPrefix(token, "uid:"), 10, 64); err == nil && n > 0 {
				return uint(n), true
			}
		}

		// 3.2) (ออปชัน) ถ้าเป็น JWT ลองอ่าน payload (dev only, no verify)
		if strings.Count(token, ".") == 2 {
			parts := strings.Split(token, ".") // header.payload.signature
			if len(parts) == 3 {
				// base64url decode
				payload := parts[1]
				if pad := len(payload) % 4; pad != 0 {
					payload += strings.Repeat("=", 4-pad)
				}
				if b, err := base64.URLEncoding.DecodeString(payload); err == nil {
					var claims map[string]any
					if err := json.Unmarshal(b, &claims); err == nil {
						// รองรับหลายคีย์: sub / id / user_id
						if v, ok := claims["sub"]; ok {
							if s := fmt.Sprint(v); s != "" {
								if n, err := strconv.ParseUint(s, 10, 64); err == nil && n > 0 {
									return uint(n), true
								}
							}
						}
						for _, k := range []string{"id", "user_id", "uid"} {
							if v, ok := claims[k]; ok {
								if s := fmt.Sprint(v); s != "" {
									if n, err := strconv.ParseUint(s, 10, 64); err == nil && n > 0 {
										return uint(n), true
									}
								}
							}
						}
					}
				}
			}
		}
	}

	return 0, false
}


// ช่วยเช็กว่า user เป็นสมาชิกของห้องไหม
func isThreadMember(db *gorm.DB, threadID, userID uint) (bool, *entity.DMThread) {
	var th entity.DMThread
	if err := db.First(&th, threadID).Error; err != nil {
		return false, nil
	}
	return (th.User1ID == userID || th.User2ID == userID), &th
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
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.FriendUsername) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// ใช้ user จาก auth เป็นหลัก (ถ้ามี), ถ้าไม่มีค่อย fallback ไป req.CurrentUserID
	if uid, ok := authedUserID(c); ok {
		if req.CurrentUserID != 0 && req.CurrentUserID != uid {
			c.JSON(http.StatusForbidden, gin.H{"error": "actor mismatch"})
			return
		}
		req.CurrentUserID = uid
	}
	if req.CurrentUserID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing current user"})
		return
	}

	db := config.DB()

	// current user
	var me entity.Member
	if err := db.First(&me, req.CurrentUserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "current user not found"})
		return
	}

	// sanitize
	raw := strings.TrimSpace(req.FriendUsername)
	raw = strings.Trim(raw, `"'`)

	// หาเพื่อน: เลข = หา id ก่อน ไม่งั้นหา user_name
	var friend entity.Member
	if _, err := strconv.Atoi(raw); err == nil {
		if e := db.First(&friend, raw).Error; e != nil {
			if e2 := db.Where("user_name = ?", raw).First(&friend).Error; e2 != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "friend username not found"})
				return
			}
		}
	} else {
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
	// ถ้ามี user จาก auth ให้ใช้ค่านั้นเป็นหลัก (จะไม่ให้ดึงห้องของคนอื่น)
	if uid, ok := authedUserID(c); ok && uid > 0 {
		// memberID จาก query (ถ้าส่งมา) ต้องตรงกับ uid
		if qidStr := c.Query("memberId"); qidStr != "" {
			if qid, err := strconv.ParseUint(qidStr, 10, 64); err == nil && uint(qid) != uid {
				c.JSON(http.StatusForbidden, gin.H{"error": "memberId mismatch"})
				return
			}
		}
		c.Request.URL.Query().Set("memberId", strconv.FormatUint(uint64(uid), 10))
	}

	memberID, err := parseUintQuery(c, "memberId")
	if err != nil || memberID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "memberId required"})
		return
	}

	db := config.DB()
	var threads []entity.DMThread

	order := "updated_at DESC"
	if db.Migrator().HasColumn(&entity.DMThread{}, "last_message_at") ||
		db.Migrator().HasColumn(&entity.DMThread{}, "LastMessageAt") {
		order = "COALESCE(last_message_at, updated_at) DESC"
	}

	if err := db.Preload("User1").
		Preload("User2").
		Where("user1_id = ? OR user2_id = ?", memberID, memberID).
		Order(order).
		Find(&threads).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query threads failed", "detail": err.Error()})
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

	uid, ok := authedUserID(c)
	if !ok || uid == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	db := config.DB()
	okMember, _ := isThreadMember(db, id, uid)
	if !okMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member of this thread"})
		return
	}

	if err := db.Delete(&entity.DMThread{}, id).Error; err != nil {
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
	uid, ok := authedUserID(c)
	if ok {
		// ถ้ามี auth ต้องเป็นสมาชิกห้องเท่านั้น
		db := config.DB()
		if isMem, _ := isThreadMember(db, threadID, uid); !isMem {
			c.JSON(http.StatusForbidden, gin.H{"error": "not a member of this thread"})
			return
		}
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
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// บังคับ sender ให้ตรงกับ auth ถ้ามี
	if uid, ok := authedUserID(c); ok {
		if req.SenderID != 0 && req.SenderID != uid {
			c.JSON(http.StatusForbidden, gin.H{"error": "sender mismatch"})
			return
		}
		req.SenderID = uid
	}
	if req.SenderID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing sender"})
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
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Content) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	uid, ok := authedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	db := config.DB()
	var post entity.DMPost
	if err := db.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	if post.SenderID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "only sender can edit"})
		return
	}

	now := time.Now()
	if err := db.Model(&entity.DMPost{}).Where("id = ?", postID).
		Updates(map[string]any{"content": req.Content, "edited_at": &now}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "edit failed"})
		return
	}
	_ = db.Preload("Sender").Preload("Files").First(&post, postID).Error
	c.JSON(http.StatusOK, gin.H{"data": post})
}

// DELETE /api/dm/posts/:id
func DeletePost(c *gin.Context) {
	postID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
		return
	}

	uid, ok := authedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	db := config.DB()
	var post entity.DMPost
	if err := db.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	if post.SenderID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "only sender can delete"})
		return
	}

	if err := db.Delete(&entity.DMPost{}, postID).Error; err != nil {
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
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// ยึด auth เป็นหลัก
	if uid, ok := authedUserID(c); ok {
		if req.MemberID != 0 && req.MemberID != uid {
			c.JSON(http.StatusForbidden, gin.H{"error": "member mismatch"})
			return
		}
		req.MemberID = uid
	}
	if req.MemberID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing memberId"})
		return
	}

	db := config.DB()
	if isMem, _ := isThreadMember(db, threadID, req.MemberID); !isMem {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member of this thread"})
		return
	}

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
