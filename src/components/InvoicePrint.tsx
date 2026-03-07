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
          {bill.gstEnabled ? (
            <>
              <tr>
                <td className="border border-black p-1 text-[10px]" colSpan={3}>
                  Subject to Nanded Jurisdiction
                </td>
                <td className="border border-black p-1 text-center font-bold" colSpan={2}>
                  Tax Invoice
                </td>
                <td className="border border-black p-1 text-right text-[10px]" colSpan={2}>
                  Ph: 02462 - 245474<br />Mob. 9823352451
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 text-center" colSpan={7}>
                  <div className="flex items-center justify-center gap-3">
                    <img src="/logo.jpeg" alt="Sadik Traders" className="h-12 w-12 rounded-full object-cover print:block" />
                    <div>
                      <div className="text-xl font-bold tracking-wide">SADIK TRADERS</div>
                      <div className="text-[11px] font-semibold">KIRANA MERCHANT & COMMISSION AGENT</div>
                      <div className="text-[11px]">Old Mondha, Nanded - 431604 (M.S.)</div>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-[11px]" colSpan={4}>
                  GST NO: <strong>{bill.gstNumber}</strong>
                </td>
                <td className="border border-black p-1 text-[11px] text-right" colSpan={3}>
                  PAN NO: <strong>{bill.panNumber}</strong>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1" colSpan={4}>
                  Name: <strong>{bill.partyName}</strong>
                </td>
                <td className="border border-black p-1" colSpan={2}>
                  Invoice No.: <strong>{bill.invoiceNo}</strong>
                </td>
                <td className="border border-black p-1" rowSpan={2}>
                  Date: <strong>{formatDate(bill.date)}</strong>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1" colSpan={4}>
                  Buyer's GSTIN: <strong>{bill.buyerGstin || "—"}</strong>
                </td>
                <td className="border border-black p-1" colSpan={2}>
                  State: <strong>{bill.state || "—"}</strong>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1" colSpan={7}>
                  Mobile: <strong>{bill.mobile}</strong>
                </td>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <td className="border border-black p-2 text-center text-lg font-bold" colSpan={4}>
                  // Estimate Copy //
                </td>
                <td className="border border-black p-2 text-center" colSpan={3}>
                  No.: <strong>{bill.invoiceNo}</strong>
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
            </>
          )}
        </tbody>
      </table>

      {/* Items */}
      <table className="w-full border-collapse border border-black border-t-0">
        <thead>
          <tr>
            <th className="border border-black p-1 text-left w-8">No.</th>
            <th className="border border-black p-1 text-left">Particulars</th>
            {bill.gstEnabled && <th className="border border-black p-1 text-center w-16">HSN Code</th>}
            <th className="border border-black p-1 text-center w-12">Qty.</th>
            <th className="border border-black p-1 text-center w-16">Weight.</th>
            <th className="border border-black p-1 text-center w-12">Unit</th>
            <th className="border border-black p-1 text-center w-16">Rate</th>
            <th className="border border-black p-1 text-right w-24">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, idx) => {
            const grossTotal = (item.grossWeightKg || 0) + (item.grossWeightGm || 0) / 1000;
            const lessTotal = (item.lessWeightKg || 0) + (item.lessWeightGm || 0) / 1000;
            return (
              <tr key={item.id}>
                <td className="border border-black p-1 text-center">{idx + 1}</td>
                <td className="border border-black p-1">
                  <div className="font-semibold">{item.productName}</div>
                  {lessTotal > 0 && (
                    <div className="text-[11px]">
                      {grossTotal.toFixed(1)}-{lessTotal.toFixed(1)}
                    </div>
                  )}
                </td>
                {bill.gstEnabled && (
                  <td className="border border-black p-1 text-center text-[11px]">{item.hsnCode || "—"}</td>
                )}
                <td className="border border-black p-1 text-center">{item.quantity}</td>
                <td className="border border-black p-1 text-center">{item.netWeight.toFixed(2)}</td>
                <td className="border border-black p-1 text-center">{item.unit}.</td>
                <td className="border border-black p-1 text-center">{item.rate.toFixed(2)}</td>
                <td className="border border-black p-1 text-right">
                  {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
          {Array.from({ length: Math.max(0, 8 - bill.items.length) }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-black p-1">&nbsp;</td>
              <td className="border border-black p-1"></td>
              {bill.gstEnabled && <td className="border border-black p-1"></td>}
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
          <tr>
            <td className="border border-black p-1" colSpan={4}>
              {bill.gstEnabled ? "Total Amount Before Tax" : "Subtotal"}
            </td>
            <td className="border border-black p-1 text-right" colSpan={3}>
              {bill.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
          {bill.gstEnabled && bill.totalCgst > 0 && (
            <tr>
              <td className="border border-black p-1" colSpan={4}>Add: CGST</td>
              <td className="border border-black p-1 text-right" colSpan={3}>{bill.totalCgst.toFixed(2)}</td>
            </tr>
          )}
          {bill.gstEnabled && bill.totalSgst > 0 && (
            <tr>
              <td className="border border-black p-1" colSpan={4}>Add: SGST</td>
              <td className="border border-black p-1 text-right" colSpan={3}>{bill.totalSgst.toFixed(2)}</td>
            </tr>
          )}
          {bill.hamali > 0 && (
            <tr>
              <td className="border border-black p-1" colSpan={4}>Add: Hamali</td>
              <td className="border border-black p-1 text-right" colSpan={3}>{bill.hamali.toFixed(2)}</td>
            </tr>
          )}
          {bill.roundedOff !== 0 && (
            <tr>
              <td className="border border-black p-1" colSpan={4}>Round Off</td>
              <td className="border border-black p-1 text-right" colSpan={3}>{bill.roundedOff.toFixed(2)}</td>
            </tr>
          )}
          <tr className="font-bold">
            <td className="border border-black p-2" colSpan={4}>
              {bill.gstEnabled ? "Total Amount After Tax ₹" : "Grand Total ₹"}
            </td>
            <td className="border border-black p-2 text-right" colSpan={3}>
              {bill.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
          {/* Payment Summary */}
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              <strong>Paid:</strong> ₹{(bill.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
            <td className="border border-black p-1 text-center" colSpan={3}>
              <strong>Pending:</strong> ₹{(bill.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
            <td className="border border-black p-1 text-right font-bold" colSpan={2}>
              {bill.status}
            </td>
          </tr>
          {bill.gstEnabled && (
            <tr>
              <td className="border border-black p-1 text-[10px]" colSpan={4}>
                <div><strong>FSSAI No: 11518048000218</strong></div>
                <div>Development Credit Bank</div>
                <div>Main Branch Nanded - 431604</div>
                <div>A/C No. 02221900001687</div>
                <div><strong>IFSC CODE: DCBL0000022</strong></div>
              </td>
              <td className="border border-black p-1 text-center text-[11px]" colSpan={1}>
                Signature
              </td>
              <td className="border border-black p-1 text-center text-[11px]" colSpan={2}>
                <div>For</div>
                <div className="font-bold mt-2">Sadik Traders</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="border border-black border-t-0 p-2 text-center text-xs">
        Goods exchange/Complaint only accepted within 8 days of billed date only
      </div>
    </div>
  );
}
