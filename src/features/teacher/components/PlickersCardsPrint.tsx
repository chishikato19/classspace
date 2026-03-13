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
          {/* Card Number Top Left */}
          <div className="absolute top-8 left-8 text-6xl font-black">{num}</div>
          {/* Card Number Top Right */}
          <div className="absolute top-8 right-8 text-6xl font-black">
            {num}
          </div>
          {/* Card Number Bottom Left */}
          <div className="absolute bottom-8 left-8 text-6xl font-black">
            {num}
          </div>
          {/* Card Number Bottom Right */}
          <div className="absolute bottom-8 right-8 text-6xl font-black">
            {num}
          </div>

          {/* Top Label (A) */}
          <div className="text-8xl font-black mb-12">A</div>

          <div className="flex items-center justify-center gap-12">
            {/* Left Label (D) */}
            <div className="text-8xl font-black transform -rotate-90">D</div>

            {/* QR Code */}
            <div className="border-8 border-black p-8 bg-white">
              <QRCodeSVG
                value={JSON.stringify({ type: "plicker", id: num.toString() })}
                size={400}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Right Label (B) */}
            <div className="text-8xl font-black transform rotate-90">B</div>
          </div>

          {/* Bottom Label (C) */}
          <div className="text-8xl font-black mt-12 transform rotate-180">
            C
          </div>
        </div>
      ))}
    </div>
  );
};
