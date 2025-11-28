export const useStockCalculations = () => {
  const getStockStatus = (quantity, reorderLevel) => {
    if (quantity < reorderLevel) return "low";
    if (quantity < reorderLevel * 1.5) return "warning";
    return "good";
  };

  const getStockColor = (status) => {
    switch (status) {
      case "low":
        return "bg-red-500/10 text-red-500";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500";
      case "good":
        return "bg-green-500/10 text-green-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStockPercentage = (quantity, maxStock) => {
    return Math.min((quantity / maxStock) * 100, 100);
  };

  const getLowStockCount = (products) => {
    return products.filter(item => getStockStatus(item.quantity, item.reorderLevel) === "low").length;
  };

  const getTotalValue = (products) => {
    return products.reduce((sum, item) => sum + item.quantity * item.selling_price, 0);
  };

  const getTotalRevenue = (sales) => {
    return sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  };

  return {
    getStockStatus,
    getStockColor,
    getStockPercentage,
    getLowStockCount,
    getTotalValue,
    getTotalRevenue
  };
};