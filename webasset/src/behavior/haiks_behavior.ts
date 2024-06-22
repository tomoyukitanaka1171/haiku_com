import {
  ApolloClient,
  ApolloQueryResult,
  NormalizedCacheObject,
  gql,
} from "@apollo/client";
import { HaikusDocument } from "../graphql/types";
import { Haiku, HaikusEdges, toHaikuId } from "../model/haikus";
import { AppDispatch } from "..";
import { swapHaikus, isLoading, setAllHaikusCount } from "../slice/haikuSlice";

export class HaikuBehavior {
  private client: ApolloClient<NormalizedCacheObject>;
  private dispatch: AppDispatch;

  constructor(
    client: ApolloClient<NormalizedCacheObject>,
    dispatch: AppDispatch
  ) {
    this.client = client;
    this.dispatch = dispatch;
  }

  async initializeHaikus() {
    this.dispatch(isLoading(true));
    // Warning: 敢えてローダーを表示しています
    await new Promise(function (resolve) {
      setTimeout(resolve, 1000);
    });
    const response = await this.client.query({
      query: gql`
        query AllHaikusCount {
          allHaikusCount
        }
      `,
    });

    this.dispatch(setAllHaikusCount(response.data.allHaikusCount));
    this.dispatch(
      swapHaikus({
        haikus: _toModel(
          await this.client.query({
            query: HaikusDocument,
            variables: {
              limit: 50,
              after: 1 * 50,
            },
          })
        ),
      })
    );
    this.dispatch(isLoading(false));
  }

  async fetchHaikusWithPagination({ page }: { page: number }) {
    const response = await this.client.query<HaikusEdges>({
      query: HaikusDocument,
      variables: {
        limit: 50,
        after: page * 50,
      },
    });

    this.dispatch(
      swapHaikus({
        haikus: _toModel(response),
      })
    );
  }

  // async insertHaiku({ state } : {state: HaikuInput }) {
  //   const response = await this.client.mutate({
  //     mutation:
  //   })
  // }
}
// type HaikuInput = {
//   id: number | null;
//   penname: string;
//   poetId: number;
//   letterBody: string;
//   letterBodyType: LetterBodyType;
//   address: string;
//   age: number;
//   imageUrl: string;
//   description: string;
// };
const _toModel = (response: ApolloQueryResult<HaikusEdges>): Haiku[] => {
  return response.data.haikus.edges.map((edge) => {
    return {
      id: toHaikuId(edge.node.id),
      text: edge.node.text,
      textKana: edge.node.textKana,
      likesCount: edge.node.likesCount,
      author: edge.node.author,
      kigo: edge.node.kigo,
    };
  });
};
