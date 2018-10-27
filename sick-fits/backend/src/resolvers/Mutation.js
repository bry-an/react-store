const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Mutations = {
    async createItem(parent, args, ctx, info) {
        //TODO: check if they are logged in
        //async: ctx.db.mutation.createItem returns a promise, 
        //and if want item to go into const item

        const item = await ctx.db.mutation.createItem({
            data: {
                ...args
            }
        }, info)
        return item
    },
    updateItem(parent, args, ctx, info) {
        //first take a copy of the updates
        const updates = { ...args }
        //remove ID from updates
        delete updates.id
        //run update method
        return ctx.db.mutation.updateItem({
            data: updates,
            where: {
                id: args.id
            }
        }, info
        )
    },
    async deleteItem(parent, args, ctx, info) {
        const where = { id: args.id }
        //find the item
        const item = await ctx.db.query.item({ where }, `{id title}`)
        //check if they own that item, or have permish
        //delete 
        return ctx.db.mutation.deleteItem({ where }, info) //info: what to return

    },
    async signup(parent, args, ctx, info) { //name has to line up with name in schema
        args.email = args.email.toLowerCase()
        //hash their password
        const password = await bcrypt.hash(args.password, 10)
        //create the user in the database
        const user = await ctx.db.mutation.createUser({
            data: {
                ...args,
                password,
                permissions: { set: ['USER'] }
            }
        }, info
        )
        //create JWT token immediately for them
        const token = jwt.sign({
            userId: user.id
        }, process.env.APP_SECRET)
        //set the JWT as cookie on response
        ctx.response.cookie('token', token, {
            httpOnly: true, 
            maxAge: 1000 * 60 * 60 * 24 * 365, //1 year
        })
        //return the user to the browser
        return user
    },
    async signin(parent, {email, password}, ctx, info) {
        //check if there is a user with that email
        const user = await ctx.db.query.user({ where: { email } })
        if(!user) {
            throw new Error(`No such user found for email ${email}`)
        }
        //check if their password is correct
        const valid = await bcrypt.compare(password, user.password)
        if(!valid) {
            throw new Error('Invalid Password')
        }
        
        //generate JWT token
        const token = jwt.sign({ userId: user.id}, process.env.APP_SECRET)
        //set the cookie with the token
        ctx.response.cookie('token', token, {
            httpOnly: true, 
            maxAge: 1000 * 60 * 60 * 24 * 265
        })
        //return the user
        return user
    }, 
    signout(parent, args, ctx, info) {
        ctx.response.clearCookie('token')
        return { message: 'Goodbye!'}
    },
    requestReset(parent, args, ctx, info) {
        
    }

};

module.exports = Mutations;
