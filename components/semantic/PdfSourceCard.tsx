"use client";

import { ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, HandThumbDownIcon, HandThumbUpIcon } from "@heroicons/react/24/outline";

export default function PdfSourceCard({
    fileName,
    page,
    text,
    query,
}: {
    fileName: string,
    page: number,
    text: string,
    query: string,
}) {
    const sendFeedbackGood = async (_:any) => {
        // Send post request
        await fetch(`/api/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                document_text: text,
                is_relevant: true
            })
        });
    };
    const sendFeedbackBad = async (_:any) => {
        await fetch(`/api/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                document_text: text,
                is_relevant: false
            })
        });
    };
    const startText = text.slice(0, 100);
    const fileUrl = `/api/uploads/${fileName}`;
    
    return <div className="flex flex-col gap-2 shadow-lg p-4 text-zinc-800 bg-cyan-50 rounded border border-zinc-400">
        <details className="group">
            <summary className="list-none flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <div className="flex flex-row gap-12 justify-between">
                        <div className="flex-1 flex flex-row gap-4 items-center text-cyan-900">
                            <h2 className="text-xl">{fileName}</h2>
                            <span className="text-sm text-muted-foreground">PDF Document</span>
                            <a 
                                title="Open PDF" 
                                href={fileUrl} 
                                target="_blank" 
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                <ArrowTopRightOnSquareIcon height={20} />
                                <span>View PDF</span>
                            </a>
                        </div>
                        <div className="text-xl text-zinc-600 hover:cursor-pointer hover:text-zinc-400">[<span className="group-open:hidden">+</span><span className="hidden group-open:inline">-</span>]</div>
                    </div>
                    <div className="flex flex-row gap-2">
                        <div className="text-sm text-muted-foreground">From page {page}</div>
                    </div>
                </div>
                <div className="text-zinc-600 hover:cursor-pointer hover:text-zinc-400 group-open:hover:text-zinc-600 group-open:hidden">{startText}...</div>
            </summary>
            <div className="text-zinc-600 mt-2">{text}</div>
        </details>
        <div className="flex flex-row gap-8 self-end">
            <div title="Relevant/Useful" className="flex flex-col gap-1 items-center hover:text-lime-400 hover:cursor-pointer">
                <HandThumbUpIcon width={36} onClick={sendFeedbackGood} />
                <div className="text-sm">Relevant or Useful</div>
            </div>
            <div title="Wrong/Useless" className="flex flex-col gap-1 items-center hover:text-orange-600 hover:cursor-pointer">
                <HandThumbDownIcon width={36} onClick={sendFeedbackBad} />
                <div className="text-sm">Wrong and Useless</div>
            </div>
        </div>
    </div>;
}