// ===== controller/create_product.go =====
package controller

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"example.com/GROUB/config"
	"example.com/GROUB/entity"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ✅ ให้ตรงกับ entity จริง ๆ
type CreateProductRequest struct {
	Name        string   `json:"name" binding:"required"` // เดิม product_name -> name
	Description string   `json:"description" binding:"required"`
	Price       int      `json:"price" binding:"required,min=0"` // เดิม float64 -> int ให้ตรงกับ entity.Product
	Quantity    int      `json:"quantity" binding:"required,min=0"`
	CategoryID  uint     `json:"category_id" binding:"required"`
	SellerID    uint     `json:"seller_id" binding:"required"`
	Images      []string `json:"images" binding:"required,min=1"`
}

func CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง"})
		return
	}

	// 1) สร้าง Product (ตาม entity.Product)
	product := entity.Product{
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Quantity:    req.Quantity,
		SellerID:    req.SellerID,
	}
	if err := config.DB().Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างสินค้าไม่สำเร็จ"})
		return
	}

	// 2) สร้าง Post_a_New_Product (มีแต่ FK/ความสัมพันธ์เท่านั้น)
	post := entity.Post_a_New_Product{
		Product_ID:  &product.ID,
		Category_ID: &req.CategoryID,
		SellerID:    &req.SellerID,
	}
	if err := config.DB().Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "โพสต์สินค้าไม่สำเร็จ"})
		return
	}

	// 3) บันทึกรูปภาพ (อ้างถึง Product_ID)
	var images []entity.ProductImage
	for _, url := range req.Images {
		images = append(images, entity.ProductImage{
			ImagePath:  url,
			Product_ID: &product.ID,
		})
	}
	if len(images) > 0 {
		if err := config.DB().Create(&images).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "บันทึกรูปภาพไม่สำเร็จ"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "สร้างสินค้าสำเร็จ",
		"product": product,
		"post":    post,
	})
}

func ListAllProducts(c *gin.Context) {
	var posts []entity.Post_a_New_Product

	if err := config.DB().
		Preload("Product.ProductImage").Preload("Category").Preload("Seller").Preload("Seller.ShopProfile").
		Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลสินค้าได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": posts})
}

// controller/post.go

func ListMyPostProducts(c *gin.Context) {
	// 1) ดึง member_id จาก JWT/middleware
	mid, ok := c.Get("member_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "missing member_id"})
		return
	}
	memberID := mid.(uint)

	// 2) หา seller ของ member นี้
	var m entity.Member
	if err := config.DB().
		Preload("Seller").
		First(&m, memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "user not found"})
		return
	}
	if m.Seller.ID == 0 {
		// ยังไม่ได้สมัครเป็นผู้ขาย → คืนลิสต์ว่างไปเลย
		c.JSON(http.StatusOK, gin.H{"data": []entity.Post_a_New_Product{}})
		return
	}
	sellerID := m.Seller.ID

	// 3) ดึงโพสต์สินค้าของ seller คนนี้
	var posts []entity.Post_a_New_Product
	if err := config.DB().
		Where("seller_id = ?", sellerID).
		Preload("Product.ProductImage").
		Preload("Category").
		Preload("Seller").
		Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลโพสต์สินค้าได้"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": posts})
}

type UpdateProductReq struct {
	PostID      uint      `json:"post_id" binding:"required"`
	Name        *string   `json:"name"`
	Description *string   `json:"description"`
	Price       *int      `json:"price"`       // ตรงกับ entity.Product.Price (int)
	Quantity    *int      `json:"quantity"`    // ตรงกับ entity.Product.Quantity (int)
	CategoryID  *uint     `json:"category_id"` // อยู่ที่ post_a_new_products
	Images      *[]string `json:"images"`      // ส่งมาถือว่า replace ทั้งชุด
}

func UpdateProduct(c *gin.Context) {
	db := config.DB()

	// 1) ตรวจอินพุต
	var in UpdateProductReq
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	// 2) เอา member_id จาก context แล้วหา seller ของคนนี้
	mid, ok := c.Get("member_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing member_id"})
		return
	}
	memberID := mid.(uint)

	var m entity.Member
	if err := db.Preload("Seller").First(&m, memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบผู้ใช้"})
		return
	}
	if m.Seller.ID == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "บัญชีนี้ยังไม่ได้เป็นผู้ขาย"})
		return
	}
	sellerID := m.Seller.ID

	// 3) โหลดโพสต์ของ seller คนนี้
	var post entity.Post_a_New_Product
	if err := db.Preload("Product").
		Where("id = ? AND seller_id = ?", in.PostID, sellerID).
		First(&post).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบโพสต์นี้"})
		return
	}
	if post.Product_ID == nil || post.Product.ID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "โพสต์นี้ไม่ผูกกับสินค้า"})
		return
	}

	// 4) เก็บรูปเก่า (ถ้าจะ replace)
	var oldImgs []entity.ProductImage
	if in.Images != nil {
		_ = db.Where("product_id = ?", post.Product_ID).Find(&oldImgs).Error
	}

	// 5) อัปเดตใน Transaction
	if err := db.Transaction(func(tx *gorm.DB) error {
		// 5.1 อัปเดตตาราง products (name/description/price/quantity)
		prodUpd := map[string]interface{}{}
		if in.Name != nil {
			prodUpd["name"] = strings.TrimSpace(*in.Name)
		}
		if in.Description != nil {
			prodUpd["description"] = strings.TrimSpace(*in.Description)
		}
		if in.Price != nil {
			prodUpd["price"] = *in.Price
		}
		if in.Quantity != nil {
			prodUpd["quantity"] = *in.Quantity
		}

		if len(prodUpd) > 0 {
			if err := tx.Model(&entity.Product{}).
				Where("id = ?", *post.Product_ID).
				Updates(prodUpd).Error; err != nil {
				return err
			}
		}

		// 5.2 อัปเดตตาราง post_a_new_products (เฉพาะ category_id)
		postUpd := map[string]interface{}{}
		if in.CategoryID != nil {
			postUpd["category_id"] = *in.CategoryID
		}

		if len(postUpd) > 0 {
			if err := tx.Model(&entity.Post_a_New_Product{}).
				Where("id = ?", post.ID).
				Updates(postUpd).Error; err != nil {
				return err
			}
		}

		// 5.3 รูปภาพ: replace ทั้งชุดถ้าส่ง images มา
		if in.Images != nil {
			if err := tx.Where("product_id = ?", *post.Product_ID).
				Delete(&entity.ProductImage{}).Error; err != nil {
				return err
			}
			if len(*in.Images) > 0 {
				imgs := make([]entity.ProductImage, 0, len(*in.Images))
				for _, u := range *in.Images {
					imgs = append(imgs, entity.ProductImage{
						ImagePath:  u,
						Product_ID: post.Product_ID,
					})
				}
				if err := tx.Create(&imgs).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 6) ลบไฟล์รูปเก่าหลัง commit (เฉพาะกรณี replace)
	for _, im := range oldImgs {
		safeRemoveUnder("uploads/products", im.ImagePath)
	}

	// 7) โหลดข้อมูลล่าสุดก่อนส่งกลับ
	_ = db.Preload("Product.ProductImage").
		Preload("Category").
		Preload("Seller").
		First(&post, post.ID).Error

	c.JSON(http.StatusOK, gin.H{"data": post})
}

// ลบไฟล์อย่างปลอดภัยเฉพาะใต้ baseDir
func safeRemoveUnder(baseDir, p string) {
	if p == "" {
		return
	}
	p = strings.TrimPrefix(p, "/")
	clean := filepath.Clean(p)
	if !strings.HasPrefix(clean, baseDir+"/") && clean != baseDir {
		return
	}
	_ = os.Remove(clean)
}

func GetPostProductByID(c *gin.Context) {
	// 1) ตรวจ id ที่มากับ URL
	idStr := c.Param("id")
	postID, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || postID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "post id ไม่ถูกต้อง"})
		return
	}

	// 2) เอา member_id จาก context แล้วหา seller ของผู้ใช้
	mid, ok := c.Get("member_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing member_id"})
		return
	}
	memberID := mid.(uint)

	var m entity.Member
	if err := config.DB().Preload("Seller").First(&m, memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบผู้ใช้"})
		return
	}
	if m.Seller.ID == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "บัญชีนี้ยังไม่ได้เป็นผู้ขาย"})
		return
	}
	sellerID := m.Seller.ID

	// 3) ดึงโพสต์นี้ ที่ต้องเป็นของ seller คนนี้เท่านั้น (own-only)
	var post entity.Post_a_New_Product
	if err := config.DB().
		Where("id = ? AND seller_id = ?", uint(postID), sellerID).
		Preload("Product.ProductImage").
		Preload("Category").
		Preload("Seller").
		First(&post).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบโพสต์นี้"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": post})
}

// GET /api/public/posts/:id
func ListPostsBySeller(c *gin.Context) {
	sid := c.Param("sellerId")
	sellerID, err := strconv.ParseUint(sid, 10, 64)
	if err != nil || sellerID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "seller id ไม่ถูกต้อง"})
		return
	}

	var posts []entity.Post_a_New_Product
	if err := config.DB().
		Where("seller_id = ?", uint(sellerID)).
		Preload("Product").
		Preload("Product.ProductImage").
		Preload("Category").
		Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "โหลดโพสต์ล้มเหลว"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": posts})
}

func SoftDeletePostWithProductAndImages(c *gin.Context) {
	id := c.Param("id")
	db := config.DB()

	if err := db.Transaction(func(tx *gorm.DB) error {
		// 1) หาโพสต์ก่อน
		var post entity.Post_a_New_Product
		if err := tx.Select("id, product_id").First(&post, id).Error; err != nil {
			return err
		}

		// 2) ลบโพสต์ (soft delete)
		if err := tx.Delete(&post).Error; err != nil {
			return err
		}

		// 3) ถ้าโพสต์มี Product_ID
		if post.Product_ID != nil {
			// 3.1 ลบรูปทั้งหมดของ product (soft delete)
			if err := tx.Where("product_id = ?", *post.Product_ID).
				Delete(&entity.ProductImage{}).Error; err != nil {
				return err
			}

			// 3.2 ลบตัว product (soft delete)
			if err := tx.Delete(&entity.Product{}, *post.Product_ID).Error; err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบโพสต์"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ลบโพสต์/สินค้า/รูป (soft) ไม่สำเร็จ"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ลบโพสต์ สินค้า และรูปภาพเรียบร้อย (soft)"})
}
