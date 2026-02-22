"use client";

import React, { forwardRef } from "react";
import Barcode from "react-barcode";

const BarcodeSheet = forwardRef(({ books = [] }, ref) => {
    return (
        <div ref={ref} className="p-8 bg-white text-black hidden print:block">
            <div className="grid grid-cols-4 gap-6">
                {books.map((book) => (
                    <div
                        key={book._id}
                        className="border p-4 flex flex-col items-center justify-center space-y-2 break-inside-avoid"
                    >
                        <div className="text-sm font-bold uppercase tracking-wider">
                            {book.number}
                        </div>
                        <div className="flex justify-center bg-white p-1">
                            <Barcode
                                value={String(book.number)}
                                width={1.2}
                                height={50}
                                fontSize={12}
                                margin={0}
                                displayValue={false}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

BarcodeSheet.displayName = "BarcodeSheet";

export default BarcodeSheet;
