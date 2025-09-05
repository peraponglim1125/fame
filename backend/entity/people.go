package entity

import ("time"
    
    "gorm.io/gorm")

type People struct {
    gorm.Model
    FirstName string
    LastName  string
    Email     string
    Age       int
    Phone     string
    BirthDay  time.Time
    Address   string

    GenderID uint
    Gender   Gender
}