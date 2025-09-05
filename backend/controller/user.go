// controller/current_user.go
package controller

import (
	"net/http"
	"example.com/GROUB/config"
	"example.com/GROUB/entity"
	"github.com/gin-gonic/gin"
)

// ---------- Current User (ใช้กับ refreshUser()) ----------
func CurrentUser(c *gin.Context) {
	mid, ok := c.Get("member_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	memberID := mid.(uint)

	var m entity.Member
	if err := config.DB().
		Preload("People").
		Preload("Seller").
		Preload("Seller.ShopProfile").
		First(&m, memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "user not found"})
		return
	}

	var sellerID *uint
	hasShop := false
	if m.Seller.ID != 0 {
		sellerID = &m.Seller.ID
		if m.Seller.ShopProfile.ID != 0 {
			hasShop = true
		}
	}

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
			"sellerID": sellerID,
			"hasShop":  hasShop,
		},
		"has_shop": hasShop,
	})
}
