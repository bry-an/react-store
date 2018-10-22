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
            maxAge: 1000 * 60 * 24 * 365, //1 year
        })
        //return the user to the browser
        return user
    }

};

module.exports = Mutations;
