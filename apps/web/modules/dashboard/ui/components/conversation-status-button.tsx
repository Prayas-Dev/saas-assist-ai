import { Doc } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Hint } from "@workspace/ui/components/hint"
import { ArrowUpIcon, CheckIcon, ArrowRightIcon } from "lucide-react";

export const ConversationStatusButton = ({
    status,
    onclick,
    disabled,
}: {
    status: Doc<"conversations">["status"];
    onclick: () => void;
    disabled?: boolean;
}) => {
    if(status === "resolved") {
        return (
            <Hint text="Mark as unresolved">
                <Button onClick={onclick} variant="tertiary" size="sm">
                    <CheckIcon />
                    Resolved
                </Button>
            </Hint>
        )
    }

    if(status === "escalated") {
        return (
            <Hint text="Mark as resolved">
                <Button disabled={disabled} onClick={onclick} variant="warning" size="sm">
                    <ArrowUpIcon />
                    Escalated
                </Button>
            </Hint>
        )
    }

    return (
        <Hint text="Mark as escalated">
            <Button disabled={disabled} onClick={onclick} variant="destructive" size="sm">
                <ArrowRightIcon />
                Unresolved
            </Button>
        </Hint>
    )
}