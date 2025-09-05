package controller

import (
	"net/http"
	"os"
	"time"

	"example.com/GROUB/config"
	"example.com/GROUB/entity"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthClaims struct {
	MemberID uint   `json:"member_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// ---------- DTO ----------
type RegisterDTO struct {
	Username  string  `json:"username"  binding:"required,min=1"`
	Password  string  `json:"password"  binding:"required,min=1"`
	FirstName string  `json:"firstName" binding:"required"`
	LastName  string  `json:"lastName"  binding:"required"`
	Email     *string `json:"email"`
	Age       *int    `json:"age"`
	Phone     *string `json:"phone"`
	Birthday  *string `json:"birthday"` // RFC3339 หรือ YYYY-MM-DD
	Address   *string `json:"address"`
	GenderID  *uint   `json:"genderID"`
}

type LoginReq struct {
	Username string `json:"username" binding:"required,min=1"`
	Password string `json:"password" binding:"required,min=1"`
}

// ---------- Register ----------
func Register(c *gin.Context) {
	var req RegisterDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid payload", "error": err.Error()})
		return
	}

	db := config.DB()

	// เช็ค username ซ้ำ (case-insensitive)
	var uCount int64
	if err := db.Model(&entity.Member{}).
		Where("LOWER(user_name) = LOWER(?)", req.Username).
		Count(&uCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to check username"})
		return
	}
	if uCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"message": "username already exists"})
		return
	}

	// เช็ค email ซ้ำ ถ้ามีส่งมา
	if req.Email != nil && *req.Email != "" {
		var eCount int64
		if err := db.Model(&entity.People{}).
			Where("LOWER(email) = LOWER(?)", *req.Email).
			Count(&eCount).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to check email"})
			return
		}
		if eCount > 0 {
			c.JSON(http.StatusConflict, gin.H{"message": "email already exists"})
			return
		}
	}

	// แฮชรหัสผ่าน
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "cannot hash password"})
		return
	}

	// แปลงวันเกิด
	var bdayPtr *time.Time
	if req.Birthday != nil && *req.Birthday != "" {
		if t, err := time.Parse(time.RFC3339, *req.Birthday); err == nil {
			bdayPtr = &t
		} else if t2, err2 := time.Parse("2006-01-02", *req.Birthday); err2 == nil {
			bdayPtr = &t2
		}
	}

	var m entity.Member
	var p entity.People

	// ใช้ Transaction กัน half-save
	if err := db.Transaction(func(tx *gorm.DB) error {
		p = entity.People{
			FirstName: req.FirstName,
			LastName:  req.LastName,
		}
		if req.Email != nil {
			p.Email = *req.Email
		}
		if req.Age != nil {
			p.Age = *req.Age
		}
		if req.Phone != nil {
			p.Phone = *req.Phone
		}
		if bdayPtr != nil {
			p.BirthDay = *bdayPtr
		}
		if req.Address != nil {
			p.Address = *req.Address
		}
		if req.GenderID != nil {
			p.GenderID = *req.GenderID
		}
		if err := tx.Create(&p).Error; err != nil {
			return err
		}

		m = entity.Member{
			UserName: req.Username,
			Password: string(hashed),
			PeopleID: p.ID,
		}
		if err := tx.Create(&m).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "register failed", "error": err.Error()})
		return
	}

	// ออก JWT
	secret := os.Getenv("SECRET")
	if secret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "server misconfigured: SECRET not set"})
		return
	}
	claims := AuthClaims{
		MemberID: m.ID,
		Username: m.UserName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			// Issuer: "groub-api",
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "cannot sign token"})
		return
	}

	// เก็บ format วันเกิด
	birthday := ""
	if bdayPtr != nil {
		birthday = bdayPtr.Format("2006-01-02")
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Register success",
		"user": gin.H{
			"id":       m.ID,
			"username": m.UserName,
			"people": gin.H{
				"id":        p.ID,
				"firstName": p.FirstName,
				"lastName":  p.LastName,
				"email":     p.Email,
				"age":       p.Age,
				"phone":     p.Phone,
				"birthday":  birthday,
				"address":   p.Address,
				"genderID":  p.GenderID,
			},
		},
		"token": signed,
	})
}

// ---------- Login ----------
func Login(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid body", "error": err.Error()})
		return
	}

	db := config.DB()

	// หา member + preload ความสัมพันธ์
	var m entity.Member
	if err := db.
		Preload("People").
		Preload("Seller").
		Preload("Seller.ShopProfile").
		Where("LOWER(user_name) = LOWER(?)", req.Username).
		First(&m).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"message": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "db error"})
		return
	}

	// ตรวจรหัสผ่าน
	if err := bcrypt.CompareHashAndPassword([]byte(m.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "password invalid"})
		return
	}

	// สถานะ seller/hasShop
	var sellerID *uint
	hasShop := false
	if m.Seller.ID != 0 {
		sellerID = &m.Seller.ID
		if m.Seller.ShopProfile.ID != 0 {
			hasShop = true
		}
	}

	// ออก JWT
	secret := os.Getenv("SECRET")
	if secret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "server misconfigured: SECRET is empty"})
		return
	}
	claims := AuthClaims{
		MemberID: m.ID,
		Username: m.UserName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "token error"})
		return
	}

	// format วันเกิด
	birthday := ""
	if !m.People.BirthDay.IsZero() {
		birthday = m.People.BirthDay.Format("2006-01-02")
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":       m.ID,
			"username": m.UserName,
			"people": gin.H{
				"id":        m.People.ID,
				"firstName": m.People.FirstName,
				"lastName":  m.People.LastName,
				"email":     m.People.Email,
				"age":       m.People.Age,
				"phone":     m.People.Phone,
				"birthday":  birthday,
				"address":   m.People.Address,
				"genderID":  m.People.GenderID,
			},
			"sellerID": sellerID, // null ถ้ายังไม่เป็นผู้ขาย
			"hasShop":  hasShop,  // true เมื่อมี ShopProfile
		},
		"token":   signed,
		"message": "Login success",
	})
}
