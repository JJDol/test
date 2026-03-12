'use client';

import Image from 'next/image';
import Br18SourceCard from './Br18SourceCard';
import PdfSourceCard from './PdfSourceCard';
import { useEffect, useState } from 'react';

interface SearchResult {
    source_nodes: Array<{
        node: {
            text: string;
            relationships: Array<{
                metadata: {
                    file_name?: string;
                    page_label?: string;
                    'br-paragraph'?: string;
                    'br-page-title'?: string;
                    'br-page-url'?: string;
                    'br-href'?: string;
                }
            }>
        }
    }>;
    base_response: string;
}

export default function Table({
    query,
}: {
    query: string;
}) {
    const [result, setResult] = useState<SearchResult>({ source_nodes: [], base_response: "" });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchResults() {
            if (!query) {
                setResult({ source_nodes: [], base_response: "No search query provided" });
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
                const data = await response.json();
                setResult(data);
            } catch (error) {
                setResult({ source_nodes: [], base_response: "Error fetching results" });
            } finally {
                setIsLoading(false);
            }
        }

        fetchResults();
    }, [query]);

    if (isLoading) {
        return <div className="text-gray-400">Loading results...</div>;
    }

    const allComps = result.source_nodes.map((node) => {
        if (node.node.relationships[1]?.metadata['file_name']) {
            const fileName = node.node.relationships[1].metadata.file_name;
            const page = parseInt(node.node.relationships[1].metadata.page_label || "0");
            const text: string = node.node.text;
            return <PdfSourceCard key={fileName + page + text.slice(0, 10)} query={query} fileName={fileName} page={page} text={text} />;
        }
        else if (node.node.relationships[1]?.metadata['br-paragraph']) {
            const source = node.node.relationships[1].metadata;
            const pageTitle = source['br-page-title'] || '';
            const pageUrl = source['br-page-url'] || '';
            const p = source['br-paragraph'] || '';
            const pHref = source['br-href'] || '';
            const text: string = node.node.text;
            return <Br18SourceCard
                key={p + pHref}
                query={query}
                p={p}
                pHref={pHref}
                pageTitle={pageTitle}
                pageUrl={pageUrl}
                text={text}
            />;
        }
        return null;
    }).filter((node): node is JSX.Element => node !== null);

    return (
        <div className="space-y-4">
            <div className="rounded-lg shadow-xl p-6 bg-gray-800 border border-gray-700">
                <p className="text-lg text-gray-100">
                    {result.base_response}
                </p>
            </div>
            <div className="space-y-4">
                {allComps}
            </div>
        </div>
    );
}