import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Bot, User } from "lucide-react"

function LoadingDots() {
  return (
    <span className="inline-flex space-x-1 items-center">
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-[bounce_1s_infinite_0ms]"></span>
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-[bounce_1s_infinite_200ms]"></span>
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-[bounce_1s_infinite_400ms]"></span>
    </span>
  );
}

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
  className?: string
}

export function ChatMessage({ role, content, isLoading, className }: ChatMessageProps) {
  return (
    <div className={cn(
      "flex gap-3 w-full",
      role === 'user' ? "justify-end" : "justify-start",
      className
    )}>
      {role === 'assistant' && (
        <Avatar className="h-8 w-8">
          <Bot className="h-5 w-5" />
        </Avatar>
      )}
      <Card className={cn(
        "max-w-[80%] p-4",
        role === 'user' 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {isLoading ? <LoadingDots /> : content}
        </div>
      </Card>
      {role === 'user' && (
        <Avatar className="h-8 w-8">
          <User className="h-5 w-5" />
        </Avatar>
      )}
    </div>
  )
} 