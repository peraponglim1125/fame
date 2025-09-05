package controller

import (
	"net/http"

	"example.com/GROUB/config"
	"example.com/GROUB/entity"
	"github.com/gin-gonic/gin"
)

func ListCategoies(c *gin.Context) {
	var categories []entity.Category

	if err := config.DB().Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ดึงข้อมูลหมวดหมู่ไม่สำเร็จ"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": categories})
}

type Category struct {
	Name string `json:"name" binding:"required"`
}

func CreateCategory(c *gin.Context) {
	var req Category
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลสินค้าไม่ครบ"})
		return
	}

	// 1. สร้าง Product
	category := entity.Category{
		Name: req.Name,
	}
	if err := config.DB().Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "เพิ่มหมวดหมู่สินค้าไม่สำเร็จ"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "สร้างหมวดหมู่สินค้าสำเร็จ",
		"Category": category,
	})
}

// Request struct เอาไว้ validate ข้อมูลจาก client
type CreateCategoryRequest struct {
    CategoryName string `json:"category_name" binding:"required"`
}

// GET /categories
func ListCShopCategory(c *gin.Context) {
    var categories []entity.ShopCategory

    if err := config.DB().Find(&categories).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "ดึงข้อมูลหมวดหมู่ไม่สำเร็จ"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"data": categories})
}

// POST /categories
func CreateCShopCategory(c *gin.Context) {
    var req CreateCategoryRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ครบ"})
        return
    }

    category := entity.ShopCategory{
        CategoryName: req.CategoryName,
    }

    if err := config.DB().Create(&category).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "เพิ่มหมวดหมู่สินค้าไม่สำเร็จ"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message":  "สร้างหมวดหมู่สินค้าสำเร็จ",
        "category": category,
    })
}

func UpdateCategory(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ต้องส่ง name"})
		return
	}

	db := config.DB()
	if err := db.Model(&entity.Category{}).
		Where("id = ?", id).
		Update("name", req.Name).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "อัปเดต category ไม่สำเร็จ"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "อัปเดต category สำเร็จ"})
}

// ----------- DELETE Category -----------
func DeleteCategory(c *gin.Context) {
	id := c.Param("id")

	db := config.DB()
	if err := db.Delete(&entity.Category{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ลบ category ไม่สำเร็จ"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ลบ category สำเร็จ"})
}

// ----------- UPDATE ShopCategory -----------
func UpdateShopCategory(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		CategoryName string `json:"category_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ต้องส่ง category_name"})
		return
	}

	db := config.DB()
	if err := db.Model(&entity.ShopCategory{}).
		Where("id = ?", id).
		Update("category_name", req.CategoryName).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "อัปเดต shop category ไม่สำเร็จ"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "อัปเดต shop category สำเร็จ"})
}

// ----------- DELETE ShopCategory -----------
func DeleteShopCategory(c *gin.Context) {
	id := c.Param("id")

	db := config.DB()
	if err := db.Delete(&entity.ShopCategory{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ลบ shop category ไม่สำเร็จ"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ลบ shop category สำเร็จ"})
}