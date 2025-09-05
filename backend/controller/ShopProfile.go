// controller/seller_shop_controller.go
package controller

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"example.com/GROUB/config"
	"example.com/GROUB/entity"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SellerShopAddressDTO struct {
	Address     string `json:"address"      binding:"required"`
	SubDistrict string `json:"sub_district" binding:"required"`
	District    string `json:"district"     binding:"required"`
	Province    string `json:"province"     binding:"required"`
}

type CreateSellerAndShopDTO struct {
	// ข้อมูลผู้ขาย (Step 1)
	SellerName    string `json:"seller_name"    binding:"required,min=1"`
	SellerAddress string `json:"seller_address" binding:"required,min=1"`

	// ข้อมูลร้าน (Step 2)
	ShopName        string               `json:"shop_name"        binding:"required,min=1"`
	Slogan          string               `json:"slogan"           binding:"required,min=1"`
	ShopDescription string               `json:"shop_description" binding:"required,min=1"`
	CategoryID      uint                 `json:"category_id"      binding:"required"`
	LogoPath        string               `json:"logo_path"        binding:"required"` // ถ้าอัปโหลดไว้ก่อนแล้ว ให้ส่ง URL/path มา
	Address         SellerShopAddressDTO `json:"address"          binding:"required"`
}

func CreateSellerAndShop(c *gin.Context) {
	midVal, ok := c.Get("member_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	memberID := midVal.(uint)

	var req CreateSellerAndShopDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid body", "error": err.Error()})
		return
	}

	db := config.DB()

	var seller entity.Seller
	var shop entity.ShopProfile
	var addr entity.ShopAddress

	if err := db.Transaction(func(tx *gorm.DB) error {
		// 1) กันสมัครซ้ำ: สมาชิกนี้เป็นผู้ขายอยู่แล้วหรือยัง
		var exist entity.Seller
		if err := tx.Where("member_id = ?", memberID).First(&exist).Error; err == nil && exist.ID != 0 {
			return fmt.Errorf("already a seller")
		}

		// 2) สร้าง Seller
		seller = entity.Seller{
			Name:     req.SellerName,
			Address:  req.SellerAddress,
			MemberID: memberID,
		}
		if err := tx.Create(&seller).Error; err != nil {
			return err
		}

		// 3) สร้าง Address ของร้าน
		addr = entity.ShopAddress{
			Address:     req.Address.Address,
			SubDistrict: req.Address.SubDistrict,
			District:    req.Address.District,
			Province:    req.Address.Province,
		}
		if err := tx.Create(&addr).Error; err != nil {
			return err
		}

		// 4) สร้าง ShopProfile ผูกกับ Seller + Address + Category
		shop = entity.ShopProfile{
			ShopName:        req.ShopName,
			ShopDescription: req.ShopDescription,
			OpenDate:        time.Now(),
			LogoPath:        req.LogoPath,
			Slogan:          req.Slogan,

			AddressID:      &addr.ID,
			ShopCategoryID: &req.CategoryID,
			SellerID:       &seller.ID,
		}
		if err := tx.Create(&shop).Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		if err.Error() == "already a seller" {
			c.JSON(http.StatusConflict, gin.H{"message": "คุณเป็นผู้ขายอยู่แล้ว"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "create seller+shop failed", "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "create seller & shop success",
		"seller": gin.H{
			"id":       seller.ID,
			"name":     seller.Name,
			"address":  seller.Address,
			"memberID": seller.MemberID,
		},
		"shop": gin.H{
			"id":               shop.ID,
			"shop_name":        shop.ShopName,
			"slogan":           shop.Slogan,
			"shop_description": shop.ShopDescription,
			"logo_path":        shop.LogoPath,
			"category_id":      shop.ShopCategoryID,
			"address_id":       shop.AddressID,
		},
	})
}

func ListMyProfile(c *gin.Context) {
	// 1) เอา member_id จาก JWT (middleware.Authz ใส่ไว้)
	mid, ok := c.Get("member_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "missing member_id"})
		return
	}
	memberID := mid.(uint)

	// 2) หา Seller ของ member คนนี้ก่อน
	var s entity.Seller
	if err := config.DB().
		Where("member_id = ?", memberID).
		First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"message": "ยังไม่ได้เป็นผู้ขาย"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "db error (seller)"})
		return
	}

	// 3) หาโปรไฟล์ร้านของ seller คนนี้
	var prof entity.ShopProfile
	if err := config.DB().
		Where("seller_id = ?", s.ID).
		Preload("ShopAddress").
		Preload("Category").
		Preload("Seller").
		First(&prof).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"message": "ยังไม่ได้สร้างโปรไฟล์ร้าน"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "db error (shop profile)"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": prof})
}

type AddressInput struct {
	Address     *string `json:"address"`
	SubDistrict *string `json:"sub_district"`
	District    *string `json:"district"`
	Province    *string `json:"province"`
}

type UpdateShopProfileInput struct {
	SellerID        uint          `json:"seller_id" binding:"required"`
	ShopName        *string       `json:"shop_name"`
	Slogan          *string       `json:"slogan"`
	ShopDescription *string       `json:"shop_description"`
	LogoPath        *string       `json:"logo_path"`
	CategoryID      *uint         `json:"category_id"`
	Address         *AddressInput `json:"address"` // มีอยู่แล้ว แค่อัปเดต
}

func UpdateShopProfile(c *gin.Context) {
	db := config.DB()

	var in UpdateShopProfileInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// หาโปรไฟล์จาก seller_id
	var p entity.ShopProfile
	if err := db.Preload("ShopAddress").
		Where("seller_id = ?", in.SellerID).
		First(&p).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	oldLogo := p.LogoPath // เก็บ path เดิมไว้เทียบ

	// ทำให้เป็น all-or-nothing
	if err := db.Transaction(func(tx *gorm.DB) error {
		// --- อัปเดต ShopProfile (partial) ---
		upd := map[string]interface{}{}
		if in.ShopName != nil {
			upd["shop_name"] = *in.ShopName
		}
		if in.Slogan != nil {
			upd["slogan"] = *in.Slogan
		}
		if in.ShopDescription != nil {
			upd["shop_description"] = *in.ShopDescription
		}
		if in.LogoPath != nil {
			upd["logo_path"] = *in.LogoPath
		}
		if in.CategoryID != nil {
			upd["shop_category_id"] = *in.CategoryID
		}

		if len(upd) > 0 {
			if err := tx.Model(&entity.ShopProfile{}).
				Where("id = ?", p.ID).
				Updates(upd).Error; err != nil {
				return err
			}
		}

		// --- อัปเดต Address (partial) ---
		if in.Address != nil && p.AddressID != nil {
			addrUpd := map[string]interface{}{}
			if in.Address.Address != nil {
				addrUpd["address"] = *in.Address.Address
			}
			if in.Address.SubDistrict != nil {
				addrUpd["sub_district"] = *in.Address.SubDistrict
			}
			if in.Address.District != nil {
				addrUpd["district"] = *in.Address.District
			}
			if in.Address.Province != nil {
				addrUpd["province"] = *in.Address.Province
			}

			if len(addrUpd) > 0 {
				if err := tx.Model(&entity.ShopAddress{}).
					Where("id = ?", *p.AddressID).
					Updates(addrUpd).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// ลบไฟล์โลโก้เก่า (ทำหลัง commit เท่านั้น)
	if in.LogoPath != nil && oldLogo != *in.LogoPath {
		clean := strings.TrimPrefix(filepath.Clean(oldLogo), "/") // ✅ S1017
		if strings.HasPrefix(clean, "uploads/logo/") {            // safety guard
			_ = os.Remove(clean)
		}
	}

	// โหลดข้อมูลล่าสุดส่งกลับ
	_ = db.Preload("ShopAddress").Preload("Category").First(&p, p.ID).Error
	c.JSON(http.StatusOK, gin.H{"data": p})
}

func GetShopProfileBySellerID(c *gin.Context) {
	sellerID := c.Param("sellerId")
	db := config.DB()

	var prof entity.ShopProfile
	if err := db.Where("seller_id = ?", sellerID).
		Preload("Category").
		Preload("ShopAddress").
		First(&prof).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบโปรไฟล์ร้าน"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ดึงข้อมูลร้านล้มเหลว"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": prof})
}
