// entity/category.go
package entity

import "gorm.io/gorm"

type Category struct {
	gorm.Model
	Name string `gorm:"type:varchar(100);not null" json:"name"`

	Post_a_New_Product []Post_a_New_Product `gorm:"foreignKey:Category_ID"`
}
