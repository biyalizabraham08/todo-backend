const Todo = require("../models/Todo");
const fs = require('fs');
const path = require('path');
const cloudinary = require('../utils/cloudinary');

exports.createTodo = async (req, res) => {
    if (!req.body) return res.status(400).send("Request body is missing. Check your headers.");
    
    try {
        const todo = new Todo({
            title: req.body.title,
            dueDate: req.body.dueDate || null,
            userId: req.user._id
        });

        await todo.save();
        res.status(201).send(todo);
    } catch (error) {
        res.status(400).send(error.message);
    }
};

exports.getTodos = async (req, res) => {
    try {
        const todos = await Todo.find({
            userId: req.user._id
        });
        res.send(todos);
    } catch (error) {
        res.status(500).send("Database Error: " + error.message);
    }
};

exports.getTodoById = async (req, res) => {
    try {
        const todo = await Todo.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!todo) return res.status(404).send();

        res.send(todo);
    } catch (error) {
        res.status(500).send("Database Error: " + error.message);
    }
};

exports.updateTodo = async (req, res) => {
    try {
        const todo = await Todo.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user._id
            },
            req.body,
            { new: true }
        );

        if (!todo) return res.status(404).send();

        res.send(todo);
    } catch (error) {
        res.status(500).send("Database Error: " + error.message);
    }
};

exports.deleteTodo = async (req, res) => {
    try {
        const todo = await Todo.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!todo) return res.status(404).send();

        res.send(todo);
    } catch (error) {
        res.status(500).send("Database Error: " + error.message);
    }
};

exports.uploadAttachment = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }

        const todo = await Todo.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!todo) return res.status(404).send("Todo not found.");

        const attachment = {
            originalName: req.file.originalname,
            filename: req.file.filename,
            publicId: req.file.filename, // Cloudinary assigns the filename as publicId
            path: req.file.path, // Cloudinary secure URL
            mimetype: req.file.mimetype,
            size: req.file.size
        };

        todo.attachments.push(attachment);
        await todo.save();

        res.send(todo);
    } catch (error) {
        res.status(500).send("Server Error: " + error.message);
    }
};

exports.deleteAttachment = async (req, res) => {
    try {
        const todo = await Todo.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!todo) return res.status(404).send("Todo not found.");

        // Express 5 wildcard parses as an array of path segments
        const requestedFilename = Array.isArray(req.params.filename) 
            ? req.params.filename.join('/') 
            : req.params.filename;

        const attachmentIndex = todo.attachments.findIndex(a => a.filename === requestedFilename);
        
        if (attachmentIndex === -1) {
            return res.status(404).send("Attachment not found.");
        }

        const attachment = todo.attachments[attachmentIndex];

        // Delete from Cloudinary
        if (attachment.publicId) {
             await cloudinary.uploader.destroy(attachment.publicId, { resource_type: "raw" }); // Try raw first
             await cloudinary.uploader.destroy(attachment.publicId, { resource_type: "image" }); // Try image just in case
             await cloudinary.uploader.destroy(attachment.publicId, { resource_type: "video" }); // Try video
        } else {
             // Fallback for old local files if any
             const filePath = path.join(__dirname, '..', 'uploads', requestedFilename);
             if (fs.existsSync(filePath)) {
                 fs.unlinkSync(filePath);
             }
        }

        todo.attachments.splice(attachmentIndex, 1);
        await todo.save();

        res.send(todo);
    } catch (error) {
        res.status(500).send("Server Error: " + error.message);
    }
};
