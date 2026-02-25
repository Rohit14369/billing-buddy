import type { BillData } from "@/pages/BillingPage";

interface Props {
  bill: BillData;
}

export default function InvoicePrint({ bill }: Props) {
  const formatDate = (d: string) => {
    const parts = d.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  return (
    <div className="bg-white text-black p-6 max-w-[210mm] mx-auto font-serif text-[13px] leading-tight">
      {/* Header */}
      <table className="w-full border-collapse border border-black mb-0">
        <tbody>
          <tr>
            <td className="border border-black p-2 text-center text-lg font-bold" colSpan={4}>
              // Estimate Copy //
            </td>
            <td className="border border-black p-2 text-center" colSpan={3}>
              Inv. No.: <strong>'{bill.invoiceNo}'</strong>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2" colSpan={4}>
              <div>Party: <strong>{bill.partyName}</strong></div>
              <div>Date: <strong>{formatDate(bill.date)}</strong></div>
            </td>
            <td className="border border-black p-2" colSpan={3}>
              Mob: <strong>{bill.mobile}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items */}
      <table className="w-full border-collapse border border-black border-t-0">
        <thead>
          <tr>
            <th className="border border-black p-1 text-left w-8">SN.</th>
            <th className="border border-black p-1 text-left">Goods supplied</th>
            <th className="border border-black p-1 text-center w-12">Qty.</th>
            <th className="border border-black p-1 text-center w-16">Weight.</th>
            <th className="border border-black p-1 text-center w-12">Unit</th>
            <th className="border border-black p-1 text-center w-16">Price</th>
            <th className="border border-black p-1 text-right w-24">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, idx) => (
            <tr key={item.id}>
              <td className="border border-black p-1 text-center">{idx + 1}</td>
              <td className="border border-black p-1">
                <div>{item.productName}</div>
                {(item.lessWeightKg > 0 || item.lessWeightGm > 0) && (
                  <div className="text-[10px]">
                    {item.grossWeightKg > 0 || item.grossWeightGm > 0 ? `${(item.grossWeightKg + item.grossWeightGm/1000).toFixed(1)}` : ''}-{(item.lessWeightKg + item.lessWeightGm/1000).toFixed(1)}
                  </div>
                )}
              </td>
              <td className="border border-black p-1 text-center">{item.quantity}</td>
              <td className="border border-black p-1 text-center">{item.netWeight.toFixed(2)}</td>
              <td className="border border-black p-1 text-center">{item.unit}.</td>
              <td className="border border-black p-1 text-center">{item.rate.toFixed(2)}</td>
              <td className="border border-black p-1 text-right">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {/* Empty rows */}
          {Array.from({ length: Math.max(0, 8 - bill.items.length) }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-black p-1">&nbsp;</td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <table className="w-full border-collapse border border-black border-t-0">
        <tbody>
          {bill.hamali > 0 && (
            <tr>
              <td className="border border-black p-1" colSpan={5}>Add : Hamali</td>
              <td className="border border-black p-1 text-right" colSpan={2}>{bill.hamali.toFixed(2)}</td>
            </tr>
          )}
          {bill.roundedOff !== 0 && (
            <tr>
              <td className="border border-black p-1" colSpan={5}>Add : Rounded Off (+)</td>
              <td className="border border-black p-1 text-right" colSpan={2}>{bill.roundedOff.toFixed(2)}</td>
            </tr>
          )}
          <tr className="font-bold">
            <td className="border border-black p-2" colSpan={2}>Party</td>
            <td className="border border-black p-2 text-center" colSpan={3}>Grand Total ₹</td>
            <td className="border border-black p-2 text-right" colSpan={2}>{bill.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <div className="border border-black border-t-0 p-2 text-center text-xs">
        Goods exchange/Complaint only accepted within 8 days of billed date only
      </div>
    </div>
  );
}
