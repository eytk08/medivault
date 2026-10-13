import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ title, description, children, className = '', showClose = true, ...props }) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
    <DialogPrimitive.Content className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none sm:p-7 ${className}`} {...props}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>{title && <DialogPrimitive.Title className="text-lg font-bold text-ink">{title}</DialogPrimitive.Title>}{description && <DialogPrimitive.Description className="mt-1 text-sm leading-6 text-slate-500">{description}</DialogPrimitive.Description>}</div>
        {showClose && <DialogPrimitive.Close aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><X size={18} /></DialogPrimitive.Close>}
      </div>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}
