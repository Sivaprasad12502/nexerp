import { z } from "zod";

const optUrl = z.string().url().optional().or(z.literal("")).or(z.undefined());
const optStr = (max = 200) =>
  z.string().trim().max(max).optional().or(z.literal("")).or(z.undefined());

export const businessSettingsPatchSchema = z.object({
  // Bank
  bankName:          optStr(),
  bankAccountName:   optStr(),
  bankAccountNumber: optStr(40),
  bankIfsc:          optStr(40),
  bankBranch:        optStr(),
  bankSwift:         optStr(40),

  // UPI
  upiId:    optStr(100),
  upiQrUrl: optUrl,

  // Branding
  letterheadUrl: optUrl,
  footerText:    optStr(1000),
  watermarkText: optStr(200),
  watermarkUrl:  optUrl,

  // Default design prefs
  defaultTemplate:   optStr(40),
  defaultThemeColor: optStr(20),
  defaultFontFamily: optStr(40),
});

export type BusinessSettingsPatch = z.infer<typeof businessSettingsPatchSchema>;
