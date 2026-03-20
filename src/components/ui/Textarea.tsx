import { cn } from '@/lib/utils';
import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="sr-only" htmlFor={id}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "w-full bg-white dark:bg-gray-800",
            "border border-border-light dark:border-gray-600 rounded-lg",
            "py-2 px-3 text-sm",
            "focus:ring-1 focus:ring-primary focus:border-primary",
            "dark:text-gray-200 outline-none placeholder-gray-400",
            "resize-none min-h-[80px] styled-scrollbar",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
