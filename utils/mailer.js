import { Resend } from "resend";

let resend = null;

const getResendClient = () => {
	if (!resend) {
		if (!process.env.RESEND_API_KEY) {
			throw new Error("RESEND_API_KEY is not set in environment variables");
		}
		resend = new Resend(process.env.RESEND_API_KEY);
	}
	return resend;
};

export const sendSubmissionEmail = async (to, fullName, applicationId) => {
	try {
		const resendClient = getResendClient();
		const fromEmail = process.env.RESEND_FROM_EMAIL;

		if (!fromEmail) {
			throw new Error("RESEND_FROM_EMAIL is not set in environment variables");
		}

		const result = await resendClient.emails.send({
			from: fromEmail,
			to: to,
			subject: "Registration Successful | Cloud Krishna",
			html:
				`
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Application Confirmation - Cloud Krishna</title>
			<style>
				/* Reset styles */
				body, table, td, div, p, a {
					-webkit-text-size-adjust: 100%;
					-ms-text-size-adjust: 100%;
				}
				table, td {
					mso-table-lspace: 0pt;
					mso-table-rspace: 0pt;
				}
				img {
					-ms-interpolation-mode: bicubic;
					border: 0;
					height: auto;
					line-height: 100%;
					outline: none;
					text-decoration: none;
				}
				body {
					margin: 0 !important;
					padding: 0 !important;
					width: 100% !important;
					height: 100% !important;
				}
				
				/* Responsive */
				@media only screen and (max-width: 600px) {
					.email-container {
						width: 100% !important;
					}
					.mobile-padding {
						padding: 30px 20px !important;
					}
					.mobile-text {
						font-size: 15px !important;
						line-height: 24px !important;
					}
					.mobile-title {
						font-size: 28px !important;
					}
				}
			</style>
		</head>
		<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;">
			<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
				<tr>
					<td align="center" style="padding: 60px 20px;">
						<!-- Main Container -->
						<table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="background-color: #ffffff;">
							
							<!-- Header -->
							<tr>
								<td style="padding: 0 0 50px 0;">
									<table border="0" cellpadding="0" cellspacing="0" width="100%">
										<tr>
											<td style="background-color: #16a34a; padding: 45px 50px; text-align: left;">
												<h2 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.9); letter-spacing: 3px; text-transform: uppercase;">
													Cloud Krishna
												</h2>
												<h1 class="mobile-title" style="margin: 0; font-size: 36px; font-weight: 600; color: #ffffff; line-height: 44px;">
													Application Submitted
												</h1>
											</td>
										</tr>
									</table>
								</td>
							</tr>
							
							<!-- Main Content -->
							<tr>
								<td class="mobile-padding" style="padding: 0 50px 50px 50px;">
									<table border="0" cellpadding="0" cellspacing="0" width="100%">
										
										<!-- Success Message -->
										<tr>
											<td style="padding-bottom: 35px;">
												<div style="background-color: #f0fdf4; padding: 20px 24px; border-left: 4px solid #16a34a;">
													<p style="margin: 0; font-size: 15px; font-weight: 500; color: #166534;">
														✓ Your application has been successfully received
													</p>
												</div>
											</td>
										</tr>
										
										<!-- Greeting -->
										<tr>
											<td style="padding-bottom: 28px;">
												<p class="mobile-text" style="margin: 0; font-size: 17px; line-height: 28px; color: #171717;">
													Hi <strong style="font-weight: 600;">${fullName}</strong>,
												</p>
											</td>
										</tr>
										
										<!-- Message -->
										<tr>
											<td style="padding-bottom: 35px;">
												<p class="mobile-text" style="margin: 0 0 16px 0; font-size: 16px; line-height: 28px; color: #404040;">
													Thank you for applying to Cloud Krishna. We've received your application and our team is reviewing all submissions carefully.
												</p>
												<p class="mobile-text" style="margin: 0; font-size: 16px; line-height: 28px; color: #404040;">
												we'll reach out to you soon directly via email or phone.
												</p>
											</td>
										</tr>
										
										<!-- Application Info -->
										<tr>
											<td style="padding-bottom: 40px;">
												<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; padding: 32px;">
													<tr>
														<td>
															<p style="margin: 0 0 20px 0; font-size: 12px; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 1.2px;">
																Application Details
															</p>
															<table border="0" cellpadding="0" cellspacing="0" width="100%">
																<tr>
																	<td width="45%" style="padding: 12px 0;">
																		<p style="margin: 0; font-size: 15px; color: #525252; font-weight: 500;">
																			Reference Number
																		</p>
																	</td>
																	<td width="55%" style="padding: 12px 0;">
																		<p style="margin: 0; font-size: 15px; font-weight: 600; color: #171717; font-family: monospace;">
																			${applicationId}
																		</p>
																	</td>
																</tr>
																<tr>
																	<td style="padding: 12px 0; border-top: 1px solid #e5e5e5;">
																		<p style="margin: 0; font-size: 15px; color: #525252; font-weight: 500;">
																			Status
																		</p>
																	</td>
																	<td style="padding: 12px 0; border-top: 1px solid #e5e5e5;">
																		<p style="margin: 0; font-size: 15px; font-weight: 600; color: #16a34a;">
																			Under Review
																		</p>
																	</td>
																</tr>
																<tr>
																	<td style="padding: 12px 0; border-top: 1px solid #e5e5e5;">
																		<p style="margin: 0; font-size: 15px; color: #525252; font-weight: 500;">
																			Next Action
																		</p>
																	</td>
																	<td style="padding: 12px 0; border-top: 1px solid #e5e5e5;">
																		<p style="margin: 0; font-size: 15px; font-weight: 600; color: #171717;">
																			Await Response
																		</p>
																	</td>
																</tr>
															</table>
														</td>
													</tr>
												</table>
											</td>
										</tr>
										
										<!-- Next Steps -->
										<tr>
											<td style="padding-bottom: 40px;">
												<p style="margin: 0 0 24px 0; font-size: 12px; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 1.2px;">
													What's Next
												</p>
												<table border="0" cellpadding="0" cellspacing="0" width="100%">
													<tr>
														<td style="padding-bottom: 20px;">
															<table border="0" cellpadding="0" cellspacing="0" width="100%">
																<tr>
																	<td width="32" valign="top">
																		<div style="width: 24px; height: 24px; background-color: #16a34a; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; font-weight: 600;">
																			1
																		</div>
																	</td>
																	<td valign="top">
																		<p style="margin: 0; font-size: 16px; line-height: 26px; color: #404040;">
																			We'll review your application and resume
																		</p>
																	</td>
																</tr>
															</table>
														</td>
													</tr>
													<tr>
														<td style="padding-bottom: 20px;">
															<table border="0" cellpadding="0" cellspacing="0" width="100%">
																<tr>
																	<td width="32" valign="top">
																		<div style="width: 24px; height: 24px; background-color: #16a34a; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; font-weight: 600;">
																			2
																		</div>
																	</td>
																	<td valign="top">
																		<p style="margin: 0; font-size: 16px; line-height: 26px; color: #404040;">
																			Shortlisted candidates will be contacted directly
																		</p>
																	</td>
																</tr>
															</table>
														</td>
													</tr>
													<tr>
														<td>
															<table border="0" cellpadding="0" cellspacing="0" width="100%">
																<tr>
																	<td width="32" valign="top">
																		<div style="width: 24px; height: 24px; background-color: #16a34a; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; font-weight: 600;">
																			3
																		</div>
																	</td>
																	<td valign="top">
																		<p style="margin: 0; font-size: 16px; line-height: 26px; color: #404040;">
																			Keep an eye on your inbox for updates
																		</p>
																	</td>
																</tr>
															</table>
														</td>
													</tr>
												</table>
											</td>
										</tr>
										
										<!-- Closing -->
										<tr>
											<td style="padding-top: 20px; border-top: 1px solid #e5e5e5;">
												<p class="mobile-text" style="margin: 0 0 28px 0; font-size: 16px; line-height: 28px; color: #404040;">
													We appreciate your interest in joining our team.
												</p>
												<p style="margin: 0 0 4px 0; font-size: 15px; color: #525252;">
													Best regards,
												</p>
												<p style="margin: 0; font-size: 16px; font-weight: 600; color: #171717;">
													Cloud Krishna Team
												</p>
											</td>
										</tr>
									</table>
								</td>
							</tr>
							
							<!-- Footer -->
							<tr>
								<td style="padding: 40px 50px; background-color: #fafafa;">
									<table border="0" cellpadding="0" cellspacing="0" width="100%">
										<tr>
											<td>
												<p style="margin: 0 0 8px 0; font-size: 13px; line-height: 20px; color: #737373;">
													This is an automated confirmation. Please do not reply.<br>
													For questions: <a href="mailto:sujalsaini3304@gmail.com" style="color: #16a34a; text-decoration: none; font-weight: 500;">sujalsaini3304@gmail.com</a>
												</p>
												<p style="margin: 0; font-size: 12px; color: #a3a3a3;">
													© 2026 Cloud Krishna. All rights reserved.
												</p>
											</td>
										</tr>
									</table>
								</td>
							</tr>
							
						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
		`
			,
		});

		if (result.error) {
			console.error("Resend error response:", result.error);
			throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
		}

		console.log("Email sent successfully. Message ID:", result.data?.id);
		return result.data;
	} catch (error) {
		console.error("Email sending failed:", error.message);
		console.error("Full error object:", error);
		throw error;
	}
};



