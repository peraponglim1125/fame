package controller

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"example.com/GROUB/config"
	"example.com/GROUB/entity"
	"github.com/gin-gonic/gin"
)

type createDiscountDTO struct {
	Name       string `form:"name" binding:"required"`
	Amount     int    `form:"amount" binding:"required"`
	MinOrder   int    `form:"min_order"`
	UsageLimit int    `form:"usage_limit"`
	StartsAt   string `form:"starts_at"`
	ExpiresAt  string `form:"expires_at"`
}

func parseTimePtr(iso string) (*time.Time, error) {
	if iso == "" {
		return nil, nil
	}
	if t, err := time.Parse(time.RFC3339, iso); err == nil {
		return &t, nil
	}
	if t, err := time.Parse("2006-01-02", iso); err == nil {
		return &t, nil
	}
	return nil, fmt.Errorf("invalid time format: %s", iso)
}

func ensureDir(p string) error {
	return os.MkdirAll(p, 0755)
}

// baseURL เช่น http://localhost:8080
func baseURL(c *gin.Context) string {
	scheme := "http"
	// ถ้า reverse proxy ใส่ X-Forwarded-Proto มาก็ใช้ได้
	if xf := c.Request.Header.Get("X-Forwarded-Proto"); xf != "" {
		scheme = xf
	}
	return fmt.Sprintf("%s://%s", scheme, c.Request.Host)
}

func saveImageAndReturnURL(c *gin.Context) (string, error) {
	file, err := c.FormFile("image")
	if err != nil || file == nil {
		return "", nil // ไม่อัปก็ไม่เป็นไร
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp":
	default:
		// ปล่อยผ่านได้ แต่แนะนำ validate ฝั่งหน้าบ้านแล้ว
	}

	uploadDir := filepath.Join("uploads", "Discountcode")
	if err := ensureDir(uploadDir); err != nil {
		return "", err
	}

	filename := fmt.Sprintf("dc_%d%s", time.Now().UnixNano(), ext)
	dst := filepath.Join(uploadDir, filename)

	if err := c.SaveUploadedFile(file, dst); err != nil {
		return "", err
	}

	return baseURL(c) + "/uploads/Discountcode/" + filename, nil
}

func CreateDiscountCode(c *gin.Context) {
	var dto createDiscountDTO
	if err := c.ShouldBind(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid form data", "error": err.Error()})
		return
	}

	startsAt, err := parseTimePtr(dto.StartsAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid starts_at", "error": err.Error()})
		return
	}
	expiresAt, err := parseTimePtr(dto.ExpiresAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid expires_at", "error": err.Error()})
		return
	}

	imageURL, err := saveImageAndReturnURL(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "upload save failed", "error": err.Error()})
		return
	}

	item := entity.Discountcode{
		Name:       dto.Name,
		Amount:     dto.Amount,
		MinOrder:   dto.MinOrder,
		UsageLimit: dto.UsageLimit,
		TimesUsed:  0,
		StartsAt:   startsAt,
		ExpiresAt:  expiresAt,
		ImageURL:   imageURL,
	}

	if err := config.DB().Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "create failed", "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

func ListDiscountCodes(c *gin.Context) {
	var items []entity.Discountcode
	if err := config.DB().Order("created_at DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "query failed", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func UpdateDiscountCode(c *gin.Context) {
	id := c.Param("id")

	var code entity.Discountcode
	if err := config.DB().First(&code, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "not found"})
		return
	}

	var dto createDiscountDTO
	if err := c.ShouldBind(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid data", "error": err.Error()})
		return
	}

	startsAt, err := parseTimePtr(dto.StartsAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid starts_at", "error": err.Error()})
		return
	}
	expiresAt, err := parseTimePtr(dto.ExpiresAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid expires_at", "error": err.Error()})
		return
	}

	// อัปเดตรูปใหม่ถ้ามีส่งมา
	newURL, err := saveImageAndReturnURL(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "upload save failed", "error": err.Error()})
		return
	}

	code.Name = dto.Name
	code.Amount = dto.Amount
	code.MinOrder = dto.MinOrder
	code.UsageLimit = dto.UsageLimit
	code.StartsAt = startsAt
	code.ExpiresAt = expiresAt
	if newURL != "" {
		// (option) ลบไฟล์เดิมออกจากดิสก์ก็ได้ ถ้าอยาก
		// oldPath := strings.TrimPrefix(code.ImageURL, baseURL(c))
		// ถ้า ImageURL เป็น absolute ให้ตัด host ออกก่อน
		code.ImageURL = newURL
	}

	if err := config.DB().Save(&code).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "update failed", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": code})
}

func DeleteDiscountCode(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB().Delete(&entity.Discountcode{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "delete failed", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
