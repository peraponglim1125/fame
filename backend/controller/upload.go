package controller



import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

// POST /api/upload-logo
func UploadLogo(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "ไฟล์โลโก้ไม่ถูกต้อง"})
		return
	}

	// ✅ สร้างชื่อใหม่
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), filepath.Ext(file.Filename))
	dst := "uploads/logo/" + filename

	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(500, gin.H{"error": "อัปโหลดโลโก้ล้มเหลว"})
		return
	}

	c.JSON(200, gin.H{"url": "/" + dst})
}

// POST /api/upload-product-images
func UploadProductImages(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(400, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	files := form.File["files"] // 👈 ต้องตรงกับ key ด้านหน้า
	var urls []string

	for _, file := range files {
		// ✅ เปลี่ยนชื่อไฟล์
		filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), filepath.Ext(file.Filename))
		dst := "uploads/products/" + filename

		if err := c.SaveUploadedFile(file, dst); err != nil {
			continue // ข้ามไฟล์ที่ error
		}

		urls = append(urls, "/"+dst)
	}

	if len(urls) == 0 {
		c.JSON(500, gin.H{"error": "ไม่สามารถอัปโหลดรูปภาพได้เลย"})
		return
	}

	c.JSON(200, gin.H{"urls": urls})
}