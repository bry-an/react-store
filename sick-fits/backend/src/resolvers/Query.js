// The returned data could come from anywhere, but usually from database
//if you don't need anything special (auth, etc), can use
//forwardTo, which will forward all info from Query in 
//prisma.graphql to the below query function
const { forwardTo } = require('prisma-binding')

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
    }
};

module.exports = Query;
