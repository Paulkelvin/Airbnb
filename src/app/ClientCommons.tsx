"use client";

import React from "react";
import { Toaster } from "sonner";
import { useThemeMode } from "@/utils/useThemeMode";

const ClientCommons = () => {
  useThemeMode();
  return <Toaster richColors position="top-center" />;
};

export default ClientCommons;
