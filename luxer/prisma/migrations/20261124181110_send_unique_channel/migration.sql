-- DropIndex
DROP INDEX "AutomationSend_flowId_dedupeKey_step_key";

-- CreateIndex
CREATE UNIQUE INDEX "AutomationSend_flowId_dedupeKey_step_channel_key" ON "AutomationSend"("flowId", "dedupeKey", "step", "channel");

