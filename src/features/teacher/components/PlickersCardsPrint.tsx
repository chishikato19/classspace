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
            
            {/* Top Label (A) */}
            <div className="text-8xl font-black mb-6">A</div>

            <div className="flex items-center justify-center gap-6">
              {/* Left Label (D) */}
              <div className="text-8xl font-black transform -rotate-90">D</div>

              {/* QR Code Container */}
              <div className="relative border-[10px] border-black p-4 bg-white">
                {/* Card Numbers at the corners of the QR code box */}
                <div className="absolute -top-12 -left-12 text-4xl font-black bg-white px-1">{num}</div>
                <div className="absolute -top-12 -right-12 text-4xl font-black bg-white px-1">{num}</div>
                <div className="absolute -bottom-12 -left-12 text-4xl font-black bg-white px-1">{num}</div>
                <div className="absolute -bottom-12 -right-12 text-4xl font-black bg-white px-1">{num}</div>

                <QRCodeSVG
                  value={JSON.stringify({ type: "plicker", id: num.toString() })}
                  size={450}
                  level="L"
                  includeMargin={false}
                />
              </div>

              {/* Right Label (B) */}
              <div className="text-8xl font-black transform rotate-90">B</div>
            </div>

            {/* Bottom Label (C) */}
            <div className="text-8xl font-black mt-6 transform rotate-180">
              C
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
