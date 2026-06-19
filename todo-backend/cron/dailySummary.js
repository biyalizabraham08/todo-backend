const cron = require('node-cron');
const User = require('../models/User');
const Todo = require('../models/Todo');
const sendEmail = require('../utils/sendEmail');

const sendDailySummaries = async () => {
    try {
        console.log('Starting daily summary email job...');
        
        // Define "today" boundary in local time
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const users = await User.find({});
        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            const todos = await Todo.find({
                userId: user._id,
                dueDate: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            if (todos.length === 0) {
                continue; // Skip users with no tasks due today
            }

            const completed = todos.filter(t => t.completed);
            const pending = todos.filter(t => !t.completed);

            const html = `
                <h2>Daily Todo Summary</h2>
                <p>Hi ${user.name},</p>
                <p>Here is your daily summary for ${startOfDay.toLocaleDateString()}:</p>
                
                <h3>Completed Tasks (${completed.length})</h3>
                <ul>
                    ${completed.map(t => `<li><strike>${t.title}</strike></li>`).join('') || '<li>No completed tasks</li>'}
                </ul>

                <h3>Pending Tasks (${pending.length})</h3>
                <ul>
                    ${pending.map(t => `<li>${t.title}</li>`).join('') || '<li>No pending tasks</li>'}
                </ul>

                <p>Great job today! Keep up the good work.</p>
                <p>Best,<br>Todo App Team</p>
            `;

            try {
                await sendEmail(user.email, 'Your Daily Todo Summary', html);
                console.log(`Sent daily summary to ${user.email}`);
            } catch (err) {
                console.error(`Failed to send daily summary to ${user.email}:`, err.message);
            }
        }
        
        console.log('Finished daily summary email job.');
    } catch (error) {
        console.error('Error in daily summary cron job:', error);
    }
};

// Schedule the task at 11:55 PM every day
// Using Asia/Kolkata timezone since the user is likely in IST (+05:30)
const initCron = () => {
    cron.schedule('55 23 * * *', () => {
        sendDailySummaries();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
    console.log('Daily summary cron job scheduled for 11:55 PM IST.');
};

module.exports = { initCron, sendDailySummaries };
