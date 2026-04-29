import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const isConfigured = () => {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

// Create a delayed transporter to avoid crashing if config is missing
let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    if (!isConfigured()) {
        console.warn('⚠️ [EMAIL SERVICE] SMTP credentials missing in .env. Email invitations will not be sent.');
        return null;
    }

    try {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            // For production reliability
            pool: true,
            maxConnections: 5,
            maxMessages: 100
        });
        
        // Verify connection silently in the background
        transporter.verify((error) => {
            if (error) {
                console.error('❌ [EMAIL SERVICE] SMTP Verification Failed:', error.message);
                transporter = null; // Reset to try again next time or fail gracefully
            } else {
                console.log('✅ [EMAIL SERVICE] SMTP Connection Established');
            }
        });

        return transporter;
    } catch (err) {
        console.error('❌ [EMAIL SERVICE] Failed to create transporter:', err.message);
        return null;
    }
};

/**
 * Sends an invitation email to a recipient
 * @param {string} to - Recipient email
 * @param {string} roomId - Room ID to join
 * @param {string} inviter - Name of the person inviting
 */
export const sendInviteEmail = async (to, roomId, inviter) => {
    try {
        const mailTransporter = getTransporter();
        
        if (!mailTransporter) {
            throw new Error('Email service is not configured or failed to initialize.');
        }

        const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
        const joinLink = `${clientUrl}/?room=${roomId}`;
        
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #0c0c1f;
                    color: #e5e3ff;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 40px auto;
                    background: #111127;
                    border: 1px solid rgba(127, 175, 255, 0.2);
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                }
                .header {
                    padding: 40px;
                    text-align: center;
                    background: linear-gradient(135deg, #7fafff 0%, #c198fe 100%);
                }
                .header h1 {
                    margin: 0;
                    color: #002e60;
                    font-size: 28px;
                    font-weight: 800;
                    letter-spacing: -1px;
                    text-transform: uppercase;
                }
                .content {
                    padding: 40px;
                    line-height: 1.6;
                }
                .content p {
                    font-size: 16px;
                    margin-bottom: 24px;
                    color: #aaa8c3;
                }
                .room-id {
                    display: inline-block;
                    padding: 8px 16px;
                    background: rgba(127, 175, 255, 0.1);
                    border: 1px solid rgba(127, 175, 255, 0.3);
                    border-radius: 12px;
                    color: #7fafff;
                    font-family: monospace;
                    font-weight: bold;
                    font-size: 18px;
                    margin: 10px 0;
                }
                .button-container {
                    text-align: center;
                    margin: 40px 0;
                }
                .button {
                    display: inline-block;
                    padding: 16px 32px;
                    background: linear-gradient(135deg, #7fafff 0%, #c198fe 100%);
                    color: #002e60;
                    text-decoration: none;
                    border-radius: 14px;
                    font-weight: 800;
                    font-size: 15px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    box-shadow: 0 10px 20px rgba(127, 175, 255, 0.2);
                }
                .footer {
                    padding: 24px;
                    text-align: center;
                    font-size: 12px;
                    color: #53536a;
                    border-top: 1px solid rgba(127, 175, 255, 0.1);
                }
                .footer a {
                    color: #7fafff;
                    text-decoration: none;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>CodeTogether</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p><strong>${inviter}</strong> has invited you to join a collaborative coding session in a high-performance digital sanctuary.</p>
                    
                    <p>Room ID:</p>
                    <div class="room-id">${roomId}</div>
                    
                    <div class="button-container">
                        <a href="${joinLink}" class="button">Establish Link</a>
                    </div>
                    
                    <p>Experience zero-latency sync and ethereal collaboration. We're waiting for you in the void.</p>
                </div>
                <div class="footer">
                    CodeTogether — Neon Luminary Edition<br>
                    <a href="${clientUrl}">Visit Sanctuary</a>
                </div>
            </div>
        </body>
        </html>
        `;

        const fromEmail = process.env.SMTP_FROM || '"CodeTogether" <noreply@codetogether.app>';

        return await mailTransporter.sendMail({
            from: fromEmail,
            to,
            subject: `[Invitation] Establish Link with ${inviter}`,
            html: htmlContent
        });
    } catch (err) {
        console.error('❌ [EMAIL SERVICE:ERROR]', err.message);
        throw err; // Rethrow to let the API handle the response
    }
};

