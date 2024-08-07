import {
  ApolloClient,
  ApolloQueryResult,
  NormalizedCacheObject,
  gql,
} from "@apollo/client";
import {
  CreateHaikuDocument,
  DoneHaikuDocument,
  HaikusDocument,
} from "../graphql/types";
import { Haiku, HaikusEdges, toHaikuId } from "../model/haikus";
import { AppDispatch, RootState } from "..";
import {
  swapHaikus,
  isLoading,
  setAllHaikusCount,
  doneHaiku,
  addHaiku,
  sortHaikuByPriority,
  backupHaiku,
  selectBackup,
  deleteBackup,
} from "../slice/haikuSlice";
import { useSelector } from "react-redux";

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
    if (!response.data.allHaikusCount) {
      this.dispatch(isLoading(false));
      return;
    }
    this.dispatch(
      swapHaikus({
        haikus: _toModel(
          await this.client.query({
            query: HaikusDocument,
            variables: {
              limit: 50,
              after: 0,
            },
          })
        ),
      })
    );
    this.dispatch(isLoading(false));
  }

  sortHaikuByPriority() {
    this.dispatch(sortHaikuByPriority());
  }

  async doneHaiku({ haiku_id }: { haiku_id: number }) {
    this.dispatch(doneHaiku(haiku_id));
    await this.client.mutate({
      mutation: DoneHaikuDocument,
      variables: {
        id: haiku_id,
      },
    });
  }

  async backupHaiku({ haiku }: { haiku: Haiku }) {
    this.dispatch(backupHaiku(haiku));
  }

  async undoHaiku({ haiku }: { haiku: Haiku }) {
    await this.client.mutate({
      mutation: CreateHaikuDocument,
      variables: {
        text: haiku.text,
        description: haiku.text,
      },
    });

    this.dispatch(addHaiku(haiku));
    this.dispatch(deleteBackup(haiku));
  }

  async fetchHaikusWithPagination({ page }: { page: number }) {
    const response = await this.client.query<HaikusEdges>({
      query: HaikusDocument,
      variables: {
        limit: 50,
        after: page * 50,
      },
    });
    if (!response.data.haikus.edges.length) {
      return;
    }

    this.dispatch(
      swapHaikus({
        haikus: _toModel(response),
      })
    );
  }

  async addHaiku({ text, description }: { text: string; description: string }) {
    const result = await this.client.mutate({
      mutation: CreateHaikuDocument,
      variables: {
        text: text,
        description: description,
      },
    });
    this.dispatch(
      addHaiku({
        id: toHaikuId(result.data.createHaiku.id),
        text: result.data.createHaiku.text,
        textKana: "",
        author: null,
        kigo: [],
        likesCount: 0,
      })
    );
  }
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
