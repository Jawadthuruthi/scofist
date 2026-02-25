import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
    bookId: z.coerce.string().min(1, { message: 'Book ID is required' }),
});

const resolver = zodResolver(schema);

async function test() {
    const result = await resolver({ bookId: "" }, {}, { criteriaMode: "all", fields: {} });
    console.log(JSON.stringify(result.errors, null, 2));
}

test();
