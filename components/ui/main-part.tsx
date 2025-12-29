import { InfoIcon } from "lucide-react";

export default function MainPart() {
    return (
        <div className="flex-1 w-full flex gap-12">
            <div className="w-full">
                <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
                    <InfoIcon size="16" strokeWidth={2} />
                    This is a protected page that you can only see as an authenticated
                    user
                </div>
            </div>
            <div className="w-1/4 flex flex-col gap-12">
                SIDE
            </div>
        </div>
    );
}