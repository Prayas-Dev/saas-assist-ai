import { SignIn } from "@clerk/nextjs"

export const SigninView = () => {
    return (
        <SignIn routing="hash" />
    )
}
