const mongoose = require('mongoose');

const uri = "mongodb+srv://vatsal:vatsal81@cluster0.mzlndif.mongodb.net/?appName=Cluster0";

async function calculateTotal() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const products = await db.collection('products').find({}).toArray();

    const totalPurchaseValue = products.reduce((sum, p) => {
      const stockAmount = Number(p.stockAmount) || 0;
      const purchaseRate = Number(p.purchaseRate) || 0;
      return sum + (stockAmount * purchaseRate);
    }, 0);

    const totalRetailValue = products.reduce((sum, p) => {
      let len = 1;
      if (p.pieceLengthType === '1.6') len = 1.6;
      else if (p.pieceLengthType === '2.5') len = 2.5;
      else if (p.pieceLengthType === 'custom' && p.customPieceLength) len = parseFloat(p.customPieceLength) || 1;
      
      const pieces = (Number(p.stockAmount) || 0) / len;
      return sum + (pieces * (Number(p.price) || 0));
    }, 0);

    console.log("Total products count:", products.length);
    console.log("Current Stock Value (Purchase):", Math.round(totalPurchaseValue));
    console.log("Stock Retail Value:", Math.round(totalRetailValue));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

calculateTotal();
