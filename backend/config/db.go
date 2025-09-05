package config

import (
	"fmt"
	"log"

	"example.com/GROUB/entity"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

func DB() *gorm.DB {
	return db
}

func ConnectionDB() {
	database, err := gorm.Open(sqlite.Open("groub.db?cache=shared"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	fmt.Println("connected database")

	db = database

	// ถ้าอยากเปิด FK ของ SQLite ให้คอมเมนต์บรรทัดนี้ออกได้ (ไม่บังคับ)
	// db.Exec("PRAGMA foreign_keys = ON;")
}

func SetupDatabase() {
	// ====== ตารางอื่น ๆ ของคุณ ======
	if err := db.AutoMigrate(
		&entity.Seller{},
		&entity.Category{},
		&entity.Post_a_New_Product{},
		&entity.Product{},
		&entity.ProductImage{},
		&entity.ShopAddress{},
		&entity.ShopCategory{},
		&entity.ShopProfile{},
		&entity.Member{},
		&entity.Gender{},
		&entity.People{},
		&entity.Discountcode{},
		&entity.DiscountUsage{},
		&entity.Order{},
	); err != nil {
		log.Fatal("AutoMigrate (base) failed:", err)
	}

	// ====== เมสเซ็นเจอร์: จัดลำดับ parent -> child ======
	if err := db.AutoMigrate(
		&entity.FriendLink{},
		&entity.DMThread{}, // parent
		&entity.DMPost{},   // child of DMThread
		&entity.DMFile{},   // child of DMPost
	); err != nil {
		log.Fatal("AutoMigrate (dm) failed:", err)
	}

	// เติมคอลัมน์ LastMessageAt ถ้ายังไม่มี (กัน ORDER BY last_message_at ล้ม)
	m := db.Migrator()
	if !m.HasColumn(&entity.DMThread{}, "LastMessageAt") && !m.HasColumn(&entity.DMThread{}, "last_message_at") {
		_ = m.AddColumn(&entity.DMThread{}, "LastMessageAt")
	}

	// ====== Seed เดิมของคุณ ======
	categories := []entity.ShopCategory{
		{CategoryName: "เสื้อผ้าแฟชั่น"},
		{CategoryName: "อิเล็กทรอนิก"},
		{CategoryName: "อาหาร"},
		{CategoryName: "ของใช้จำเป็น"},
		{CategoryName: "เกมมิ่งเกียร์"},
	}
	for _, cat := range categories {
		result := db.FirstOrCreate(&cat, entity.ShopCategory{CategoryName: cat.CategoryName})
		if result.Error != nil {
			log.Println("เพิ่มหมวดหมู่ล้มเหลว:", result.Error)
		} else {
			fmt.Println("เพิ่มหมวดหมู่:", cat.CategoryName)
		}
	}

	categoriesProduct := []entity.Category{
		{Name: "เสื้อผ้าแฟชั่น"},
		{Name: "อิเล็กทรอนิก"},
		{Name: "อาหาร"},
		{Name: "ของใช้จำเป็น"},
		{Name: "เกมมิ่งเกียร์"},
	}
	for _, cat := range categoriesProduct {
		result := db.FirstOrCreate(&cat, entity.Category{Name: cat.Name})
		if result.Error != nil {
			log.Println("เพิ่ม Category สินค้าล้มเหลว:", result.Error)
		} else {
			fmt.Println("เพิ่ม Category สินค้า:", cat.Name)
		}
	}

	genders := []entity.Gender{
		{Gender: "ชาย"},
		{Gender: "หญิง"},
	}
	for _, g := range genders {
		result := db.FirstOrCreate(&g, entity.Gender{Gender: g.Gender})
		if result.Error != nil {
			log.Println("เพิ่มเพศล้มเหลว:", result.Error)
		} else {
			fmt.Println("เพิ่มเพศ:", g.Gender)
		}
	}
}
