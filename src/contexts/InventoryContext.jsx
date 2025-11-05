import { createContext, useContext, useState } from "react";

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
 const [products, setProducts] = useState([
    { id: 1, name: 'Basmati Rice', category: 'Grocery', brand: 'India Gate', quantity: 45, unit: 'kg', costPrice: 80, sellingPrice: 100, tax: 5, reorderLevel: 20, maxStock: 100, location: 'Warehouse A', barcode: 'BRC001', expiryDate: '2025-12-31', supplierId: 1 },
    { id: 2, name: 'Coca Cola', category: 'Beverage', brand: 'Coca Cola', quantity: 12, unit: 'bottles', costPrice: 30, sellingPrice: 40, tax: 12, reorderLevel: 30, maxStock: 150, location: 'Warehouse B', barcode: 'BEV001', expiryDate: '2025-11-15', supplierId: 2 },
  
  ]);

  // 🔽 update stock after sale
  const reduceStock = (productId, soldQty) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, quantity: Math.max(p.quantity - soldQty, 0) }
          : p
      )
    );
  };

  return (
    <InventoryContext.Provider value={{ products, setProducts, reduceStock }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => useContext(InventoryContext);
