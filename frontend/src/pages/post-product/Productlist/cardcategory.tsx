import React, { useState } from 'react'

type Props = {
    categories: { ID: number; name: string }[];
    selectedCategory: string;
    setSelectedCategory: (cat: string) => void;
};

const Cardcategory = ({ categories, selectedCategory, setSelectedCategory }: Props) => {
    return (
        <>
            <ul
                style={{
                    display: "flex",
                    gap: "16px",
                    listStyle: "none",
                    padding: 0,
                }}
            >
                <li
                    key="ทั้งหมด"
                    onClick={() => setSelectedCategory("ทั้งหมด")}
                    style={{
                        cursor: "pointer",
                        fontWeight: selectedCategory === "ทั้งหมด" ? "bold" : "normal",
                        borderBottom:
                            selectedCategory === "ทั้งหมด" ? "2px solid black" : "none",
                        paddingBottom: "10px",
                    }}
                >
                    ทั้งหมด
                </li>
                {categories.map((cat: any) => (
                    <li
                        key={cat.ID}
                        onClick={() => setSelectedCategory(cat.name)}
                        style={{
                            cursor: "pointer",
                            fontWeight:
                                selectedCategory === cat.name ? "bold" : "normal",
                            borderBottom:
                                selectedCategory === cat.name ? "2px solid black" : "none",
                            paddingBottom: "10px",
                        }}
                    >
                        {cat.name}
                    </li>
                ))}
            </ul>
            
        </>
    )
}

export default Cardcategory
