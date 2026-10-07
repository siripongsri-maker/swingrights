import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useI18n } from "@/i18n";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/*
 * Toasts sit bottom-right, lifted above whatever is fixed at the bottom so they never cover
 * Quick Exit or a bottom nav:
 * - from 601px: above the floating Quick Exit pill (16px gap + 48px pill + 16px gap)
 * - up to 600px (Sonner goes full width): above the bottom tab bar / action bar; Quick Exit is
 *   in the header at the top there.
 * --action-bar-h and --bottom-nav-h are published by index.css.
 */
const DESKTOP_OFFSET = {
  bottom: "calc(var(--action-bar-h, 0px) + var(--bottom-nav-h, 0px) + 80px + env(safe-area-inset-bottom))",
};
const MOBILE_OFFSET = {
  bottom: "calc(var(--action-bar-h, 0px) + var(--bottom-nav-h, 0px) + 16px + env(safe-area-inset-bottom))",
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const { t, dir } = useI18n();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      offset={DESKTOP_OFFSET}
      mobileOffset={MOBILE_OFFSET}
      dir={dir}
      containerAriaLabel={t("ui.notifications")}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
