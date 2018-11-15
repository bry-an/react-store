// The returned data could come from anywhere, but usually from database
//if you don't need anything special (auth, etc), can use
//forwardTo, which will forward all info from Query in 
//prisma.graphql to the below query function
const { forwardTo } = require('prisma-binding')
const { hasPermission } = require('../utils')


//here, info includes the graphql query that contains the fields requested from the frontend

const Query = {
    items: forwardTo('db'),
    item: forwardTo('db'),
    itemsConnection: forwardTo('db'),
    me(parent, args, ctx, info) {
        //check to see if there is a current userId
        if(!ctx.request.userId) {
            return null
        }
        return ctx.db.query.user({
            where: { id: ctx.request.userId }
        }, info)
    },
    async users(parent, args, ctx, info) {
        //check if user is logged in 
        if(!ctx.request.userId) {
            throw new Error('You must be logged in to do this.')
        }

        //check if the user has the permissions to query the users
        hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE'])

        //if yes, query the users
        return ctx.db.query.users({}, info)
    }, 
    async order(parent, args, ctx, info) {
        // make sure they're logged in
        if (!ctx.request.userId) {
            throw new Error('You aren\'t logged in')
        }
        // query current order
        const order = await ctx.db.query.order({
            where: { id: args.id }
        }, info)
        // check if they have permish to see this order
        const ownsOrder = order.user.id === ctx.request.userId
        const hasPermissionToSeeOrder = ctx.request.user.permissions.includes('ADMIN');
        // if (!ownsOrder || !hasPermissionToSeeOrder) {
        //     throw new Error('You cannot see this')
        // } # commented out because permissions needs to be fixed...
        // return the order
        return order
    }

};

module.exports = Query;
