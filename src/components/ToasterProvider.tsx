import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster 
      position="top-right"
      theme="light"
      richColors
      closeButton
      expand
    />
  );
}
