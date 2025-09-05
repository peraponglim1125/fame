// middleware/authz.go
package middleware

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type AuthClaims struct {
	MemberID uint   `json:"member_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func Authz() gin.HandlerFunc {
	secret := os.Getenv("SECRET")
	if secret == "" {
		panic("SECRET env is empty")
	}

	return func(c *gin.Context) {
		// Authorization: Bearer <token>
		h := c.GetHeader("Authorization")
		parts := strings.Fields(h)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "invalid or missing Authorization header"})
			return
		}
		tokenStr := parts[1]

		claims := &AuthClaims{}
		tok, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			// บังคับ HS256 เท่านั้น
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok || t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(secret), nil
		})
		if err != nil || !tok.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "invalid token"})
			return
		}

		// ตรวจวันหมดอายุ (เผื่อ clock skew 30s)
		if claims.ExpiresAt == nil || time.Now().After(claims.ExpiresAt.Time.Add(30*time.Second)) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "token expired"})
			return
		}

		// เซ็ตค่าไว้ให้ handler ใช้
		c.Set("member_id", claims.MemberID)
		c.Set("username", claims.Username)

		c.Next()
	}
}
