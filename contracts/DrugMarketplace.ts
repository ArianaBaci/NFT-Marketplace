import { defineConfig } from "hardhat/config";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";

export default defineConfig({
  plugins: [hardhatNetworkHelpers],
});