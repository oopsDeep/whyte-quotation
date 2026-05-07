"use client";
import { useRef } from "react";
import { useParams } from "next/navigation";
import { Quotation, Company } from "@/types";
import { formatCurrency, formatDate, getProductTotals } from "@/lib/utils";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ProductTags from "@/components/estimator/ProductTags";
import Link from "next/link";
import Image from "next/image";
import { Manrope } from "next/font/google";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useQuotation, useCompany } from "@/lib/swr";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

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
  const { data: quotation = null, isLoading: loadingQ } = useQuotation(id);
  const { data: company = null, isLoading: loadingC } = useCompany();
  const loading = loadingQ || loadingC;
  const printRef = useRef<HTMLDivElement>(null);

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
    (s: number, r) => s + r.items.reduce(
      (rs: number, i) => rs + i.quantity * Number(i.unitPrice),
      0
    ),
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
  const summaryRooms = quotation.rooms.filter((room) => room.items.length > 0 || Boolean(room.notes?.trim()));
  const detailedRooms = quotation.rooms.filter((room) => room.items.length > 0);
  const productTotals = getProductTotals(quotation);

  return (
    <div className={`${manrope.variable}`}>
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
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:rounded-none"
        >
          <div className="px-6 md:px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-[#0f2f61] via-[#1b3c73] to-[#2d6be4] relative overflow-hidden">
            <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 left-12 w-64 h-64 rounded-full bg-[#f27798]/20 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="max-w-[68%]">
                <div className="inline-flex items-center gap-3 bg-white/95 px-4 py-2.5 rounded-xl shadow-sm">
                  <Image src="/company-logo.png" alt="Whyte logo" width={170} height={44} className="h-9 w-auto object-contain" priority />
                </div>
              </div>
              <div className="text-right shrink-0 bg-white/95 backdrop-blur px-4 py-3 rounded-xl shadow-sm min-w-[220px]">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#1b3c73] font-semibold mb-1">Quotation</p>
                <p className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">{quotation.quotationNumber}</p>
                <p className="text-xs md:text-sm text-slate-500 mt-1">Date: {formatDate(quotation.createdAt)}</p>
                {quotation.validUntil && (
                  <p className="text-xs text-slate-400 mt-1">Valid until: {formatDate(quotation.validUntil)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 py-5 border-b border-slate-200 bg-[#f8faff]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#1b3c73] font-semibold mb-2">Company Details</p>
                <div className="space-y-1 text-sm text-slate-700">
                  <p className="text-base font-semibold text-slate-900">{company?.name ?? "Whyte Automations Pvt. Ltd."}</p>
                  <p>{company?.phone}</p>
                  {company?.email && <p>{company.email}</p>}
                  <p>GSTIN: {company?.gstNumber || WHYTE_DEFAULT_GST}</p>
                  {company?.address && <p className="text-slate-600">{company.address}</p>}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#1b3c73] font-semibold mb-2">Prepared For</p>
                <div className="space-y-1 text-sm text-slate-700">
                  <p className="text-base font-semibold text-slate-900">{quotation.clientName}</p>
                  {quotation.clientPhone && <p>Phone: {quotation.clientPhone}</p>}
                  {quotation.clientEmail && <p>Email: {quotation.clientEmail}</p>}
                  {quotation.clientGstNumber && <p>GSTIN: {quotation.clientGstNumber}</p>}
                  {quotation.clientAddress && <p className="text-slate-600">{quotation.clientAddress}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Page 1: Summary */}
          <section className="px-6 md:px-8 py-6 md:py-7 space-y-7">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-sm font-semibold tracking-[0.12em] uppercase text-slate-700">Summary</h2>
              <span className="text-xs text-slate-500">Room-wise overview</span>
            </div>

            {summaryRooms.map((room) => {
                const roomName = room.customName ?? room.roomType?.name ?? "Room";
                const roomTotal = room.items.reduce((s: number, i) => s + i.quantity * Number(i.unitPrice), 0);
                return (
                  <section key={room.id} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                      <h3 className="font-semibold text-slate-800 text-sm tracking-wide uppercase">
                        {roomName}
                        {room.subArea ? ` — ${room.subArea}` : ""}
                      </h3>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(roomTotal)}</span>
                    </div>
                    {room.notes?.trim() && (
                      <div className="px-4 py-2 text-xs text-slate-600 border-b border-slate-100 bg-white">
                        Note: {room.notes.trim()}
                      </div>
                    )}
                    {room.items.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 border-b border-slate-100">
                              <th className="text-left px-3 py-2 text-xs font-semibold">SB No.</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold">Product</th>
                              <th className="text-center px-3 py-2 text-xs font-semibold">Qty</th>
                              <th className="text-right px-3 py-2 text-xs font-semibold">Unit Price</th>
                              <th className="text-right px-3 py-2 text-xs font-semibold">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {room.items.map((item) => {
                              const lineTotal = item.quantity * Number(item.unitPrice);
                              return (
                                <tr key={item.id} className="bg-white">
                                  <td className="px-3 py-2 text-slate-500 text-xs font-mono">{item.sbNumber ?? "-"}</td>
                                  <td className="px-3 py-2 font-medium text-slate-900">{item.product?.name ?? "-"}</td>
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

            {productTotals.length > 0 && (
              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-800 text-sm tracking-wide uppercase">Product Totals</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-100">
                        <th className="text-left px-3 py-2 text-xs font-semibold">Product</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold">Code</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold">Total Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productTotals.map((item) => (
                        <tr key={item.product.id} className="bg-white">
                          <td className="px-3 py-2 font-medium text-slate-900">{item.product.name}</td>
                          <td className="px-3 py-2 text-slate-500 font-mono text-xs">{item.product.code ?? "-"}</td>
                          <td className="px-3 py-2 text-center text-slate-700 font-semibold">{item.totalQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-2 rounded-xl border border-slate-200 p-4 bg-slate-50">
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
                <div className="flex justify-between bg-slate-900 text-white px-4 py-3 rounded-lg">
                  <span className="font-semibold tracking-wide">Grand Total</span>
                  <span className="font-bold text-lg">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Detailed pages */}
          <section style={{ breakBefore: "page" }} className="px-6 md:px-8 py-6 md:py-7 border-t border-slate-200 print:border-t-0 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-sm font-semibold tracking-[0.12em] uppercase text-slate-700">Detailed Product View</h2>
              <span className="text-xs text-slate-500">Large product cards for easy review</span>
            </div>

            {detailedRooms.map((room, roomIndex) => {
              const roomName = room.customName ?? room.roomType?.name ?? "Room";
              const roomTotal = room.items.reduce((s: number, i) => s + i.quantity * Number(i.unitPrice), 0);

              return (
                <section
                  key={room.id}
                  className="rounded-xl border border-slate-200 overflow-hidden"
                  style={roomIndex > 0 ? { breakBefore: "page" } : undefined}
                >
                  <div className="px-4 md:px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 text-sm tracking-wide uppercase">
                      {roomName}
                      {room.subArea ? ` — ${room.subArea}` : ""}
                    </h3>
                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(roomTotal)}</span>
                  </div>

                  {room.notes?.trim() && (
                    <div className="px-4 md:px-5 py-2.5 text-xs text-slate-600 border-b border-slate-100 bg-white">
                      Note: {room.notes.trim()}
                    </div>
                  )}

                  <div className="p-4 md:p-5 space-y-4 bg-white">
                    {room.items.map((item) => {
                      const lineTotal = item.quantity * Number(item.unitPrice);
                      return (
                        <article key={item.id} className="rounded-xl border border-slate-200 p-4" style={{ breakInside: "avoid" }}>
                          <div className="flex gap-4 md:gap-5 items-start">
                            <div className="w-[110px] h-[110px] md:w-[130px] md:h-[130px] rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.product?.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product?.name ?? "Product"}
                                  crossOrigin="anonymous"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-100" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-base md:text-lg font-semibold text-slate-900 leading-tight">{item.product?.name ?? "-"}</p>
                              <p className="text-xs md:text-sm text-slate-500 mt-1 font-mono">Code: {item.product?.code ?? "-"}</p>
                              {item.product?.category && (
                                <div className="mt-1.5">
                                  <ProductTags product={item.product} mode="full" />
                                </div>
                              )}
                              <p className="text-xs md:text-sm text-slate-600 mt-1.5">{item.product?.description ?? "-"}</p>

                              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Quantity</p>
                                  <p className="font-semibold text-slate-900 mt-0.5">{item.quantity}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Unit Price</p>
                                  <p className="font-semibold text-slate-900 mt-0.5">{formatCurrency(item.unitPrice)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
                                  <p className="font-bold text-base md:text-lg text-slate-900 mt-0.5">{formatCurrency(lineTotal)}</p>
                                </div>
                              </div>

                              {item.sbNumber && (
                                <p className="text-xs text-slate-500 mt-2">SB No.: <span className="font-mono">{item.sbNumber}</span></p>
                              )}
                              {item.notes?.trim() && <p className="text-xs text-slate-600 mt-1">Item Note: {item.notes.trim()}</p>}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {quotation.terms && (
              <div className="border-t border-slate-200 pt-5" style={{ breakBefore: "page" }}>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] mb-2">Terms & Conditions</p>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{quotation.terms}</p>
              </div>
            )}

            {notedItems.length > 0 && (
              <div className="border-t border-slate-200 pt-5" style={{ breakBefore: quotation.terms ? undefined : "page" }}>
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
          </section>

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
