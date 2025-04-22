import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface VerificationEmailProps {
  verificationUrl: string
  email: string
}

export const VerificationEmail = ({ verificationUrl, email }: VerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to COSMILE - Verify your email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`}
            width="180"
            height="60"
            alt="STARLUX Airlines"
            style={logo}
          />
          <Heading style={heading}>Welcome to COSMILE</Heading>
          <Text style={paragraph}>
            Thank you for joining the premium frequent flyer program of STARLUX Airlines. To complete your registration,
            please verify your email address and set your password.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={verificationUrl}>
              Set Your Password
            </Button>
          </Section>
          <Text style={paragraph}>
            If you didn't request this email, there's nothing to worry about - you can safely ignore it.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            © {new Date().getFullYear()} STARLUX Airlines. All rights reserved.
            <br />
            <Link href="https://starluxairlines.com/privacy" style={link}>
              Privacy Policy
            </Link>{" "}
            •{" "}
            <Link href="https://starluxairlines.com/terms" style={link}>
              Terms of Service
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: "#f8f5f2",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
}

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "580px",
}

const logo = {
  margin: "0 auto 24px",
  display: "block",
}

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#0f2d3c",
  textAlign: "center" as const,
}

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#3a4f5c",
  margin: "16px 0",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#8a7a4e",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
}

const hr = {
  borderColor: "#dfe1e4",
  margin: "32px 0",
}

const footer = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#8898aa",
  textAlign: "center" as const,
}

const link = {
  color: "#8898aa",
  textDecoration: "underline",
}

export default VerificationEmail
