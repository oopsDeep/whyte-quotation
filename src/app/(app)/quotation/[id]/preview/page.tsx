"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Quotation, Company } from "@/types";
import { formatCurrency, formatDate, getProductTotals } from "@/lib/utils";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Link from "next/link";
import Image from "next/image";
import { Manrope, Cormorant_Garamond } from "next/font/google";
import { ArrowLeft, Download, Printer } from "lucide-react";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const WHYTE_DEFAULT_GST = "24AAXCS4505Q1ZK";

const collectNotedItems = (quotation: Quotation) =>
  quotation.rooms.flatMap((room) => {
    const roomName = room.customName ?? room.roomType?.name ?? "Room";
    return room.items
      .filter((item) => Boolean(item.notes?.trim()))
      .map((item) => ({
        id: item.id,
        roomName,
        productName: item.product?.name ?? "-",
        sbNumber: item.sbNumber ?? "-",
        note: item.notes?.trim() ?? "",
      }));
  });

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const [qRes, cRes] = await Promise.all([fetch(`/api/quotations/${id}`), fetch("/api/company")]);
      const [q, c] = await Promise.all([qRes.json(), cRes.json()]);
      setQuotation(q);
      setCompany(c);
      setLoading(false);
    };
    init();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!quotation || !printRef.current) return;

    // Wait for web fonts so PDF snapshot matches preview typography.
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const [{ default: jsPDF }, htmlToImage] = await Promise.all([
      import("jspdf"),
      import("html-to-image"),
    ]);

    const target = printRef.current;
    const imageData = await htmlToImage.toPng(target, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });

    const imageElement = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to build image for PDF"));
      img.src = imageData;
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageMargin = 6;
    const usableWidth = pageWidth - pageMargin * 2;
    const usableHeight = pageHeight - pageMargin * 2;
    const imageHeight = (imageElement.height * usableWidth) / imageElement.width;

    let renderedHeight = 0;
    let isFirstPage = true;

    while (renderedHeight < imageHeight) {
      if (!isFirstPage) {
        pdf.addPage();
      }

      const positionY = pageMargin - renderedHeight;
      pdf.addImage(imageData, "PNG", pageMargin, positionY, usableWidth, imageHeight, undefined, "FAST");

      renderedHeight += usableHeight;
      isFirstPage = false;
    }

    pdf.save(`${quotation.quotationNumber}.pdf`);
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;
  if (!quotation) return <div className="text-center py-20 text-gray-400">Quotation not found</div>;

  const grandTotal = quotation.rooms.reduce(
    (s, r) => s + r.items.reduce((rs, i) => rs + i.quantity * Number(i.unitPrice), 0),
    0
  );
  const discountAmount =
    quotation.discountType === "percentage"
      ? (grandTotal * Number(quotation.discountValue ?? 0)) / 100
      : quotation.discountType === "fixed"
      ? Number(quotation.discountValue ?? 0)
      : 0;
  const finalTotal = grandTotal - discountAmount;
  const notedItems = collectNotedItems(quotation);

  return (
    <div className={`${manrope.variable} ${cormorant.variable}`}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-7">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link
            href={`/quotation/${id}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition"
          >
            <ArrowLeft size={16} />
            Back to Estimator
          </Link>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b1a30] text-white rounded-xl font-semibold text-sm hover:bg-[#132b4b] transition shadow-lg shadow-slate-900/20"
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </div>

        <div
          ref={printRef}
          className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:rounded-none"
        >
          <div className="relative overflow-hidden text-white px-6 md:px-8 py-6 md:py-7 bg-gradient-to-br from-[#071a34] via-[#173f75] to-[#f27798]">
            <div className="pointer-events-none absolute -top-24 -right-14 h-72 w-72 rounded-full border border-white/30" />
            <div className="pointer-events-none absolute -top-16 -right-2 h-56 w-56 rounded-full border border-white/20" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full border border-white/20" />
            <div className="flex justify-between items-start gap-4">
              <div className="max-w-[70%]">
                <div className="bg-white inline-flex rounded-xl px-3 py-2 mb-3">
                  <Image
                    src="/company-logo.png"
                    alt="Whyte logo"
                    width={180}
                    height={45}
                    className="h-8 md:h-9 w-auto object-contain"
                    priority
                  />
                </div>
                <h1 className="text-2xl md:text-3xl [font-family:var(--font-cormorant)] font-semibold leading-tight">
                  {company?.name ?? "Whyte Automations"}
                </h1>
                <p className="text-white/80 text-sm mt-2">{company?.phone}</p>
                {company?.email && <p className="text-white/80 text-sm">{company.email}</p>}
                <p className="text-white/75 text-sm mt-0.5">GSTIN: {company?.gstNumber || WHYTE_DEFAULT_GST}</p>
                <p className="text-white/75 text-sm mt-0.5">{company?.address}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/60 mb-1">Quotation</p>
                <p className="text-2xl md:text-3xl font-bold [font-family:var(--font-cormorant)]">{quotation.quotationNumber}</p>
                <p className="text-white/70 text-sm mt-2">{formatDate(quotation.createdAt)}</p>
                {quotation.validUntil && (
                  <p className="text-white/50 text-xs mt-1">Valid until: {formatDate(quotation.validUntil)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 py-5 bg-slate-50 border-b border-slate-200">
            <p className="text-[11px] text-slate-500 uppercase font-semibold tracking-[0.18em] mb-1">Prepared For</p>
            <p className="text-2xl [font-family:var(--font-cormorant)] font-semibold text-slate-900">{quotation.clientName}</p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600">
              {quotation.clientPhone && (
                <p>
                  <span className="text-slate-500">Phone: </span>
                  {quotation.clientPhone}
                </p>
              )}
              {quotation.clientEmail && (
                <p>
                  <span className="text-slate-500">Email: </span>
                  {quotation.clientEmail}
                </p>
              )}
              {quotation.clientGstNumber && (
                <p>
                  <span className="text-slate-500">GSTIN: </span>
                  {quotation.clientGstNumber}
                </p>
              )}
              {quotation.clientAddress && (
                <p className="md:col-span-3">
                  <span className="text-slate-500">Address: </span>
                  {quotation.clientAddress}
                </p>
              )}
            </div>
          </div>

          <div className="px-6 md:px-8 py-6 md:py-7 space-y-7">
            {quotation.rooms
              .filter((r) => r.items.length > 0 || Boolean(r.notes?.trim()))
              .map((room) => {
                const roomName = room.customName ?? room.roomType?.name ?? "Room";
                const roomTotal = room.items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0);
                return (
                  <section key={room.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="w-full bg-[#eff4ff] px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="font-semibold text-[#1b3c73] text-sm tracking-wide uppercase">
                        {roomName}
                        {room.subArea ? ` — ${room.subArea}` : ""}
                      </h3>
                      <span className="text-sm font-semibold text-slate-700">{formatCurrency(roomTotal)}</span>
                    </div>
                    {room.notes?.trim() && (
                      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">Room Note</p>
                        <p className="text-xs md:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{room.notes.trim()}</p>
                      </div>
                    )}
                    {room.items.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-[#1b3c73] text-white">
                              <th className="text-left px-3 py-2 text-xs font-semibold">SB No.</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold">Product Name</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold">Code</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold hidden md:table-cell">Description</th>
                              <th className="text-center px-3 py-2 text-xs font-semibold">Qty</th>
                              <th className="text-right px-3 py-2 text-xs font-semibold">Unit Price</th>
                              <th className="text-right px-3 py-2 text-xs font-semibold">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {room.items.map((item, idx) => {
                              const lineTotal = item.quantity * Number(item.unitPrice);
                              return (
                                <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                                  <td className="px-3 py-2 text-slate-500 text-xs font-mono">{item.sbNumber ?? "-"}</td>
                                  <td className="px-3 py-2 font-medium text-slate-900">
                                    {item.product?.name ?? "-"}
                                    {item.variantLabel && (
                                      <span className="block text-xs text-slate-500 font-normal mt-0.5">{item.variantLabel}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500 font-mono text-xs">{item.product?.code ?? "-"}</td>
                                  <td className="px-3 py-2 text-slate-500 text-xs hidden md:table-cell">{item.product?.description ?? "-"}</td>
                                  <td className="px-3 py-2 text-center text-slate-700">{item.quantity}</td>
                                  <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrency(lineTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-500 bg-white">No products added in this room.</div>
                    )}
                  </section>
                );
              })}

            {/* Product Summary */}
            {(() => {
              const productTotals = getProductTotals(quotation);
              if (productTotals.length === 0) return null;
              return (
                <section className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="w-full bg-[#f0f4ff] px-4 py-2.5 border-b border-slate-200">
                    <h3 className="font-semibold text-[#1b3c73] text-sm tracking-wide uppercase">Product Summary (Total Quantities)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#1b3c73] text-white">
                          <th className="text-left px-3 py-2 text-xs font-semibold">Product Name</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold">Code</th>
                          <th className="text-center px-3 py-2 text-xs font-semibold">Total Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productTotals.map((item, idx) => (
                          <tr key={item.product.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                            <td className="px-3 py-2 font-medium text-slate-900">{item.product.name}</td>
                            <td className="px-3 py-2 text-slate-500 font-mono text-xs">{item.product.code ?? "-"}</td>
                            <td className="px-3 py-2 text-center text-slate-700 font-semibold">{item.totalQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })()}

            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-2 rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCurrency(grandTotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount ({quotation.discountType === "percentage" ? `${quotation.discountValue}%` : "Fixed"})</span>
                    <span>− {formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between bg-[#0b1a30] text-white px-4 py-3 rounded-xl">
                  <span className="font-semibold tracking-wide">Grand Total</span>
                  <span className="font-bold text-lg [font-family:var(--font-cormorant)]">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>

            {quotation.terms && (
              <div className="border-t border-slate-200 pt-5">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] mb-2">Terms & Conditions</p>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{quotation.terms}</p>
              </div>
            )}

            {notedItems.length > 0 && (
              <div className="border-t border-slate-200 pt-5">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] mb-2">Site Visit Notes</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600">
                        <th className="text-left px-3 py-2 text-xs font-semibold">Room</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold">Product</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold">SB No.</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold">Customer Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {notedItems.map((n) => (
                        <tr key={n.id}>
                          <td className="px-3 py-2 text-slate-700 text-xs">{n.roomName}</td>
                          <td className="px-3 py-2 text-slate-900 text-sm font-medium">{n.productName}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs font-mono">{n.sbNumber}</td>
                          <td className="px-3 py-2 text-slate-700 text-sm whitespace-pre-wrap">{n.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border-t border-slate-200 px-6 md:px-8 py-4 text-center">
            <p className="text-sm text-slate-500">
              Thank you for choosing <strong>{company?.name}</strong>
            </p>
            {company?.tagline && <p className="text-xs text-slate-400 mt-1">{company.tagline}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
