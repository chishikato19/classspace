import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface PlickersCardsPrintProps {
  count?: number;
}

export const PlickersCardsPrint: React.FC<PlickersCardsPrintProps> = ({
  count = 60,
}) => {
  const cards = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="hidden print:block bg-white text-black">
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            .page-break {
              page-break-after: always;
            }
          }
        `}
      </style>

      {cards.map((num, index) => (
        <div
          key={num}
          className={`w-[210mm] h-[297mm] mx-auto flex flex-col items-center justify-center relative bg-white ${index < cards.length - 1 ? "page-break" : ""}`}
        >
          {/* Central Container for QR and Labels */}
          <div className="relative flex flex-col items-center justify-center">
            
            {/* Card Numbers near the corners of the QR code */}
            <div className="absolute -top-16 -left-16 text-5xl font-black">{num}</div>
            <div className="absolute -top-16 -right-16 text-5xl font-black">{num}</div>
            <div className="absolute -bottom-16 -left-16 text-5xl font-black">{num}</div>
            <div className="absolute -bottom-16 -right-16 text-5xl font-black">{num}</div>

            {/* Top Label (A) */}
            <div className="text-9xl font-black mb-8">A</div>

            <div className="flex items-center justify-center gap-8">
              {/* Left Label (D) */}
              <div className="text-9xl font-black transform -rotate-90">D</div>

              {/* QR Code Container */}
              <div className="border-[12px] border-black p-4 bg-white">
                <QRCodeSVG
                  value={JSON.stringify({ type: "plicker", id: num.toString() })}
                  size={550}
                  level="L"
                  includeMargin={false}
                />
              </div>

              {/* Right Label (B) */}
              <div className="text-9xl font-black transform rotate-90">B</div>
            </div>

            {/* Bottom Label (C) */}
            <div className="text-9xl font-black mt-8 transform rotate-180">
              C
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
