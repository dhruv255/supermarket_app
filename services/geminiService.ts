import { GoogleGenAI } from "@google/genai";
import { Customer, Transaction, TransactionType } from "../types";

const initGenAI = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateReminderMessage = async (customer: Customer, dueAmount: number): Promise<string> => {
  const ai = initGenAI();
  if (!ai) return `Hello ${customer.name}, your pending balance is ₹${dueAmount}. Please pay at your earliest convenience.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Write a polite, professional, yet firm WhatsApp reminder message for a grocery store customer named "${customer.name}".
        The customer owes ₹${dueAmount}.
        The tone should be friendly to maintain the relationship but clearly ask for payment.
        Keep it under 30 words.
        Include emojis.
        Do not include placeholders like [Date].
      `,
    });
    return response.text || "Error generating message.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Hello ${customer.name}, friendly reminder that your balance of ₹${dueAmount} is pending. Please clear it soon! 🙏`;
  }
};

export const analyzeStoreHealth = async (totalCredit: number, totalCollected: number, customerCount: number): Promise<string> => {
  const ai = initGenAI();
  if (!ai) return "AI insights unavailable without API Key.";

  try {
    const prompt = `
      You are a financial advisor for a small Indian grocery store (Kirana shop).
      Analyze these metrics:
      - Total Outstanding Credit (Market Udhaar): ₹${totalCredit}
      - Total Collected (Received): ₹${totalCollected}
      - Active Borrowing Customers: ${customerCount}

      Provide a 2-sentence summary of the business health and 1 specific actionable tip to improve cash flow.
      Keep it encouraging but realistic.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analysis failed.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not generate analysis at this time.";
  }
};

export const suggestTransactionCategory = async (items: string): Promise<string> => {
     const ai = initGenAI();
     if (!ai) return "General";
     
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Categorize these grocery items into one word (e.g., Dairy, Grains, Snacks, Household): "${items}". Return ONLY the category word.`
        });
        return response.text.trim();
     } catch (e) {
         return "General";
     }
}

export const generateTransactionMessage = async (customer: Customer, type: TransactionType, amount: number, items: string, balance: number): Promise<string> => {
  const ai = initGenAI();
  const isBorrow = type === TransactionType.BORROW;
  const actionStr = isBorrow ? 'Credit Added' : 'Payment Received';
  
  // Fallback message
  const fallback = `*${actionStr}*\nName: ${customer.name}\nAmount: ₹${amount}\n${isBorrow ? `Items: ${items}\n` : ''}Current Balance: ₹${balance}`;

  if (!ai) return fallback;

  try {
    const prompt = `
        You are a smart assistant for a Kirana Store (Grocery Shop) owner. 
        Write a short WhatsApp message to customer "${customer.name}".
        
        Transaction Context:
        - Type: ${isBorrow ? 'Added to Credit (Udhaar)' : 'Payment Received (Jama)'}
        - Amount: ₹${amount}
        - Description: ${items}
        - Updated Total Due Balance: ₹${balance}

        Guidelines:
        - Be polite and professional.
        - If credit: "Added ₹${amount} for ${items} to your account."
        - If payment: "Received ₹${amount}. Thank you."
        - Always mention the Total Due Balance at the end clearly.
        - Use appropriate emojis.
        - No markdown bolding (asterisks) unless necessary for Amount/Balance.
        - Keep it very concise (under 30 words).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim() || fallback;
  } catch (error) {
    console.error("Gemini Error:", error);
    return fallback;
  }
};