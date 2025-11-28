import { useState } from 'react';

export const useModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saleProducts, setSaleProducts] = useState([{ productId: "", qty: 1 }]);
  const [purchaseProducts, setPurchaseProducts] = useState([{ productId: "", qty: 1 }]);
  const [returnItems, setReturnItems] = useState([{ productId: "", qty: 1, reason: "" }]);

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    
    if (item) {
      setFormData({
        productId: item.product_id,
        name: item.name,
        category: item.category,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        costPrice: item.cost_price,
        sellingPrice: item.selling_price,
        tax: item.tax_percent,
        reorderLevel: item.reorderLevel,
        maxStock: item.maxStock,
        expiryDate: item.expiryDate || item.expiry_date,
        location: item.location,
        barcode: item.barcode,
        supplierId: item.supplierId,
      });
    } else {
      setFormData({});
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({});
    setSaleProducts([{ productId: "", qty: 1 }]);
    setPurchaseProducts([{ productId: "", qty: 1 }]);
    setReturnItems([{ productId: "", qty: 1, reason: "" }]);
  };

  return {
    showModal,
    modalType,
    editingItem,
    formData,
    setFormData,
    saleProducts,
    setSaleProducts,
    purchaseProducts,
    setPurchaseProducts,
    returnItems,
    setReturnItems,
    openModal,
    closeModal
  };
};