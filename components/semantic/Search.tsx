'use client';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, ChangeEvent } from 'react';
import { Suspense } from 'react';
import TableSkeleton from './TableSkeleton';
import Table from './Table';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function Search({ 
    placeholder, 
    query 
}: { 
    placeholder: string;
    query: string | undefined;
}) {
    const [searchTerm, setSearchTerm] = useState<string | undefined>(query);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            <div className="relative">
                <label htmlFor="search" className="sr-only">
                    Search
                </label>
                <div className="relative">
                    <input
                        id="search"
                        className="block w-full rounded-lg border border-gray-200 py-3 pl-12 pr-4 text-sm placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                        placeholder={placeholder}
                        onChange={handleChange}
                        defaultValue={query}
                    />
                    <MagnifyingGlassIcon 
                        className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" 
                    />
                </div>
            </div>

            <Suspense fallback={<TableSkeleton />}>
                <Table query={debouncedSearchTerm || ''} />
            </Suspense>
        </div>
    );
}