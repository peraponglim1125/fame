// routes/router.go
package routes

import (
	"time"

	"example.com/GROUB/controller"
	mw "example.com/GROUB/middlewares"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// CORS: อนุญาตให้ frontend ส่ง Authorization และ X-User-Id มาได้
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000", "http://localhost:8081"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Requested-With", "X-User-Id"},
		ExposeHeaders:    []string{"Content-Length", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// เสิร์ฟไฟล์อัปโหลด (ใช้ใน DM upload)
	r.Static("/uploads", "./uploads")

	api := r.Group("/api")
	{
		// ----------------- ตัวอย่างเส้นทางของระบบเดิม -----------------
		api.POST("/register", controller.Register)
		api.POST("/login", controller.Login)
		api.POST("/upload-logo", controller.UploadLogo)
		api.POST("/upload-Product", controller.UploadProductImages)
		api.POST("/post-Product", controller.CreateProduct)

		api.POST("/seller-shop", mw.Authz(), controller.CreateSellerAndShop)
		api.GET("/current-user", mw.Authz(), controller.CurrentUser)
		api.GET("/ListMyProfile", mw.Authz(), controller.ListMyProfile)
		api.GET("/ListMyPostProducts", mw.Authz(), controller.ListMyPostProducts)

		api.GET("/listAllProducts", controller.ListAllProducts)
		api.GET("/listCategory", controller.ListCategoies)
		api.GET("/post-products/:id", mw.Authz(), controller.GetPostProductByID)
		api.PUT("/UpdateShopProfile", mw.Authz(), controller.UpdateShopProfile)
		api.PUT("/UpdateProduct", mw.Authz(), controller.UpdateProduct)

		api.POST("/CreateCategory", controller.CreateCategory)
		api.GET("/shops/:sellerId/posts", controller.ListPostsBySeller)
		api.GET("/shops/:sellerId/profile", controller.GetShopProfileBySellerID)

		api.GET("/ListCShopCategory", controller.ListCShopCategory)
		api.POST("/CreateCShopCategory", controller.CreateCShopCategory)
		api.PUT("/categories/:id", controller.UpdateCategory)
		api.DELETE("/categories/:id", controller.DeleteCategory)
		api.PUT("/shopcategories/:id", controller.UpdateShopCategory)
		api.DELETE("/shopcategories/:id", controller.DeleteShopCategory)

		api.DELETE("/DeletePost/:id", mw.Authz(), controller.SoftDeletePostWithProductAndImages)

		// ----------------- DiscountCode (ตามที่ขอเพิ่ม) -----------------
		api.GET("/discountcodes", controller.ListDiscountCodes)
		api.POST("/discountcodes", controller.CreateDiscountCode)
		api.PUT("/discountcodes/:id", controller.UpdateDiscountCode)
		api.DELETE("/discountcodes/:id", controller.DeleteDiscountCode)

		// ----------------- Messenger (DM) -----------------
		dm := api.Group("/dm")
		{
			// ไม่ครอบ Authz() เพื่อให้ dev auth แบบ Bearer uid:<id> ใช้งานได้
			dm.POST("/threads/open", controller.OpenThread)
			dm.GET("/threads", controller.ListThreads)
			dm.DELETE("/threads/:id", controller.DeleteThread)

			dm.GET("/threads/:id/posts", controller.ListPosts)
			dm.POST("/threads/:id/posts", controller.CreatePost)
			dm.PATCH("/posts/:id", controller.EditPost)
			dm.DELETE("/posts/:id", controller.DeletePost)

			dm.PATCH("/threads/:id/read", controller.MarkRead)
			dm.POST("/upload", controller.UploadFile)
		}
	}

	return r
}
